import { homedir } from 'os'
import { join } from 'path'
import { existsSync } from 'fs'
import { readFile, writeFile, copyFile, readdir } from 'fs/promises'
import * as spawn from 'await-spawn'
import { parse, encode } from 'ini'
import { SSOClient, GetRoleCredentialsCommand } from '@aws-sdk/client-sso'

import { Profiles, Profile, Credential, ParsedConfig, CachedCredential, RoleCredential } from './types'

const AWS_CONFIG_FILE = join(homedir(), '.aws', 'config')
const AWS_CREDENTIALS_FILE = process.env.AWS_SHARED_CREDENTIALS_FILE || join(homedir(), '.aws', 'credentials')
const AWS_SSO_CACHE_DIR = join(homedir(), '.aws', 'sso', 'cache')

async function readConfig<T> (filename: string = AWS_CONFIG_FILE): Promise<ParsedConfig<T>> {
  const data = await readFile(filename, { encoding: 'utf8', flag: 'r'})
  return parse(data) as ParsedConfig<T>
}

async function writeConfig<T> (filename: string = AWS_CONFIG_FILE, config: T): Promise<void> {
  const data = encode(config, { whitespace: true })
  await writeFile(filename, data, { encoding: 'utf8', flag: 'w' })
}

async function loadJson (path: string): Promise<unknown> {
  const data = await readFile(path, { encoding: 'utf8', flag: 'r'})
  return JSON.parse(data) as unknown
}

async function exportCredentials (profiles: Profiles, login: CachedCredential, format: 'dotenv' | 'export'): Promise<string> {
  const credentials = await getRoleCredentials(profiles.selected, login)
  const prefix = format === 'export' ? 'export ' : ''
  const nawssoMarker = `${prefix}NAWSSO_AWS_ACCESS_KEY_ID=${credentials.accessKeyId}\n`
  const key = `${prefix}AWS_ACCESS_KEY_ID=${credentials.accessKeyId}\n`
  const secret = `${prefix}AWS_SECRET_ACCESS_KEY=${credentials.secretAccessKey}\n`
  const token = `${prefix}AWS_SESSION_TOKEN=${credentials.sessionToken}\n`
  return nawssoMarker + key + secret + token
}

async function createBackup (filename: string): Promise<void> {
  const firstRunBackupPath = `${filename}.backup.firstrun`
  const backupPath = `${filename}.backup`
  if (existsSync(filename)) {
    if (existsSync(firstRunBackupPath)) {
      await copyFile(filename, backupPath)
    } else {
      await copyFile(filename, firstRunBackupPath)
    }
  }
}

async function getProfiles (selectProfile?: string): Promise<Profiles> {
  const profiles = { profiles: {} } as Profiles
  const config = await readConfig<Profile>()
  if (!selectProfile) {
    let startUrl
    for (const profile in config) {
      if (profile.startsWith('profile ')) {
        if (config[profile].sso_start_url != null) {
          if (!startUrl) {
            selectProfile = profile.slice(8)
            startUrl = config[profile].sso_start_url
          }
          if (startUrl === config[profile].sso_start_url) {
            const currentProfile = profile.slice(8)
            profiles.profiles[currentProfile] = config[profile]
            profiles.profiles[currentProfile].name = currentProfile
          } else {
            selectProfile = undefined
          }
        }
      }
    }
  }
  if (!selectProfile) {
    throw new Error('You must specificy a profile when multiple AWS SSO endpoints are configured')
  }
  if (!profiles.profiles[selectProfile]) {
    profiles.profiles[selectProfile] = config[`profile ${selectProfile}`]
    profiles.profiles[selectProfile].name = selectProfile
  }
  if (!profiles.profiles[selectProfile]) {
    throw new Error(`No profile found for ${selectProfile}`)
  }
  profiles.selected = profiles.profiles[selectProfile]
  profiles.selected.name = profiles.profiles[selectProfile].name
  return profiles
}

async function getLogin (profiles: Profiles, force: boolean): Promise<CachedCredential> {
  if (force) {
    await spawn('aws', ['sso', 'login', '--profile', profiles.selected.name], {stdio: [process.stdin, process.stdout]})
  }
  const files = (await readdir(AWS_SSO_CACHE_DIR)).map(x => join(AWS_SSO_CACHE_DIR, x))
  for (const file of files) {
    const data = await loadJson(file)
    if (
      isCredential(data) &&
      !isExpired(data.expiresAt) &&
      isMatchingStartUrl(data, profiles.selected)
    ) {
      return data
    }
  }
  throw new Error('Cached SSO login is expired/invalid, try running `aws sso login` and try again')
}

async function getRoleCredentials (profile: Profile, login: CachedCredential): Promise<RoleCredential> {
  const sso = new SSOClient({ region: profile.sso_region })
  const cmd = new GetRoleCredentialsCommand({
    accessToken: login.accessToken,
    accountId: profile.sso_account_id,
    roleName: profile.sso_role_name
  })
  const result = await sso.send(cmd)
  if (
    !result.roleCredentials?.accessKeyId || 
    !result.roleCredentials?.secretAccessKey || 
    !result.roleCredentials?.sessionToken || 
    !result.roleCredentials.expiration
  ) {
    throw new Error('Unable to fetch role credentials with AWS SDK')
  }
  return result.roleCredentials as RoleCredential
}

async function updateCredentials (profiles: Profiles, login: CachedCredential): Promise<void> {
  const config = await readConfig<Credential>(AWS_CREDENTIALS_FILE)
  for (const profile in profiles.profiles) {
    const currentProfile = profiles.profiles[profile]
    const credentials = await getRoleCredentials(currentProfile, login)
    config[currentProfile.name] = {
      region: currentProfile.region,
      aws_access_key_id: credentials.accessKeyId,
      aws_secret_access_key: credentials.secretAccessKey,
      aws_session_token: credentials.sessionToken,
      aws_security_token: credentials.sessionToken,
      aws_session_expiration: expirationToUTCDateTimeString(credentials.expiration)
    }
  }
  await createBackup(AWS_CREDENTIALS_FILE)
  await writeConfig(AWS_CREDENTIALS_FILE + '-test', config)
}

function isMatchingStartUrl (cred: CachedCredential, profile: Profile): boolean {
  const normalizedStartUrl = cred?.startUrl?.endsWith('#/') ? cred.startUrl.slice(0, -2) : cred?.startUrl
  return normalizedStartUrl != null &&
    profile?.sso_start_url != null &&
    normalizedStartUrl.length > 0 &&
    profile.sso_start_url.length > 0 &&
    normalizedStartUrl === profile.sso_start_url
}

function expirationToUTCDateTimeString(expiresAt?: number): string {
  if (!expiresAt) {
    throw new Error('foo')
  }
  return new Date(expiresAt).toISOString().replace('.000Z', '+0000')
}

function isExpired (expiresAt: string): boolean {
  const now = Date.now()
  const exp = new Date(expiresAt.replace('UTC', ''))
  const expired = now > exp.getTime()
  return expired
}

function isCredential (config: Profile | CachedCredential | unknown): config is CachedCredential {
  return (config as CachedCredential)?.accessToken != null &&
    (config as CachedCredential).expiresAt != null
}

export { 
  getProfiles,
  getLogin,
  getRoleCredentials,
  updateCredentials,
  exportCredentials
}