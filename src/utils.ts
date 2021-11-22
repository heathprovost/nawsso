import { homedir } from 'os'
import { join } from 'path'
import { existsSync } from 'fs'
import { readFile, writeFile, copyFile, readdir } from 'fs/promises'
import * as spawn from 'await-spawn'
import { parse, encode } from 'ini'
import { ParsedConfig, Profile, LoginSession, Credential } from './interfaces'

const AWS_PROFILES_FILE = join(homedir(), '.aws', 'config')
const AWS_CREDENTIALS_FILE = process.env.AWS_SHARED_CREDENTIALS_FILE || join(homedir(), '.aws', 'credentials')
const AWS_SSO_CACHE_DIR = join(homedir(), '.aws', 'sso', 'cache')

async function loadCredentials (): Promise<ParsedConfig<Credential>> {
  const data = await readFile(AWS_CREDENTIALS_FILE, { encoding: 'utf8', flag: 'r'})
  return parse(data) as ParsedConfig<Credential>
}

async function loadProfiles (): Promise<ParsedConfig<Profile>> {
  const data = await readFile(AWS_PROFILES_FILE, { encoding: 'utf8', flag: 'r'})
  return parse(data) as ParsedConfig<Profile>
}

async function saveCredentials (config: ParsedConfig<Credential>): Promise<void> {
  const data = encode(config, { whitespace: true })
  await writeFile(AWS_CREDENTIALS_FILE, data, { encoding: 'utf8', flag: 'w' })
}

async function loadJson (path: string): Promise<unknown> {
  const data = await readFile(path, { encoding: 'utf8', flag: 'r'})
  return JSON.parse(data) as unknown
}

async function createBackup (filename: string = AWS_CREDENTIALS_FILE): Promise<void> {
  const firstRunBackupPath = `${filename}.nawsso-firstrun.backup`
  const backupPath = `${filename}.nawsso.backup`
  if (existsSync(filename)) {
    if (existsSync(firstRunBackupPath)) {
      await copyFile(filename, backupPath)
    } else {
      await copyFile(filename, firstRunBackupPath)
    }
  }
}

function isMatchingStartUrl (url1: string, url2: string): boolean {
  url1 = url1.endsWith('#/') ? url1.slice(0, -2) : url1
  url2 = url2.endsWith('#/') ? url2.slice(0, -2) : url2
  return (url1 != null && url2 != null && url1.length > 0 && url2.length > 0 && url1 === url2)
}

function expirationToUTCDateTimeString (expiresAt?: number): string {
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

function isCredential (data: Profile | LoginSession | unknown): data is LoginSession {
  return (data as LoginSession)?.accessToken != null && (data as LoginSession).expiresAt != null
}

async function login (profile: Profile, forceLogin: boolean = false): Promise<LoginSession> {
  if (forceLogin) {
    await spawn('aws', ['sso', 'login', '--profile', profile.name], {stdio: [process.stdin, process.stdout]})
  }
  const files = (await readdir(AWS_SSO_CACHE_DIR)).map(x => join(AWS_SSO_CACHE_DIR, x))
  for (const file of files) {
    const data = await loadJson(file)
    if (
      isCredential(data) &&
      isMatchingStartUrl(data.startUrl, profile.sso_start_url)
    ) {
      return isExpired(data.expiresAt) 
        ? await login(profile, true) 
        : data
    }
  }
  throw new Error('Cached SSO login is expired/invalid, try running `aws sso login` and try again')
}

export {
  loadCredentials,
  saveCredentials,
  loadProfiles,
  loadJson,
  createBackup,
  isMatchingStartUrl,
  expirationToUTCDateTimeString,
  isExpired,
  isCredential,
  login
}
