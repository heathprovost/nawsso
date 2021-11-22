import { homedir } from 'os'
import { join } from 'path'
import { existsSync } from 'fs'
import { readFile, writeFile, copyFile, readdir } from 'fs/promises'
import * as spawn from 'await-spawn'
import { parse, encode } from 'ini'
import { SSOClient, GetRoleCredentialsCommand, RoleCredentials } from '@aws-sdk/client-sso'

const AWS_CONFIG_FILE = join(homedir(), '.aws', 'config')
const AWS_CREDENTIALS_FILE = process.env.AWS_SHARED_CREDENTIALS_FILE || join(homedir(), '.aws', 'credentials')
const AWS_SSO_CACHE_DIR = join(homedir(), '.aws', 'sso', 'cache')

interface Profile {
  name: string
  output: string
  region: string
  sso_account_id: string
  sso_region: string
  sso_role_name: string
  sso_start_url: string
}

interface Profiles {
  [key: string]: Profile
}

interface ParsedConfig<T> {
  [key: string]: T
}

interface Credential {
  region?: string
  aws_access_key_id: string
  aws_secret_access_key: string
  aws_session_token?: string
  aws_security_token?: string
  aws_session_expiration?: string
}

interface RoleCredential extends RoleCredentials {
  accessKeyId: string
  secretAccessKey: string
  sessionToken: string
  expiration: number
}
  
interface LoginSession {
  accessToken: string
  expiresAt: string
  region: string
  startUrl: string
}

async function readConfig<T> (filename: string): Promise<ParsedConfig<T>> {
  const data = await readFile(filename, { encoding: 'utf8', flag: 'r'})
  return parse(data) as ParsedConfig<T>
}

async function writeConfig<T> (filename: string, config: T): Promise<void> {
  const data = encode(config, { whitespace: true })
  await writeFile(filename, data, { encoding: 'utf8', flag: 'w' })
}

async function loadJson (path: string): Promise<unknown> {
  const data = await readFile(path, { encoding: 'utf8', flag: 'r'})
  return JSON.parse(data) as unknown
}

async function createBackup (filename: string): Promise<void> {
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

class AwsSso {
  private readonly _profile: Profile
  private readonly _profiles: Profiles
  private _session: LoginSession

  constructor (profile: Profile, profiles: Profiles, session: LoginSession) {
    this._profile = profile
    this._profiles = profiles
    this._session = session
  }

  public static async fromResolvedProfiles (profile: Profile, profiles: Profiles, forceLogin: boolean = false): Promise<AwsSso> {
    const session = await login(profile, forceLogin)
    return new AwsSso(profile, profiles, session)
  }

  public static async fromProfileNameOrStartUrl (profileNameOrStartUrl?: string, forceLogin: boolean = false): Promise<AwsSso> {
    let profileName: string | undefined
    const isStartUrl = profileNameOrStartUrl?.startsWith('https://')
    const profiles: Profiles = {}
    const config = await readConfig<Profile>(AWS_CONFIG_FILE)
    if (!profileNameOrStartUrl || isStartUrl) {
      let startUrl = isStartUrl ? profileNameOrStartUrl : undefined
      for (const profile in config) {
        if (profile.startsWith('profile ')) {
          if (config[profile].sso_start_url != null) {
            if (!startUrl) {
              startUrl = startUrl ?? config[profile].sso_start_url
            }
            if (isMatchingStartUrl(startUrl, config[profile].sso_start_url)) {
              profileName = profileName ?? profile.slice(8)
              const currentProfile = profile.slice(8)
              profiles[currentProfile] = config[profile]
              profiles[currentProfile].name = currentProfile
            } else if (!isStartUrl) {
              profileName = undefined
            }
          }
        }
      }
    } else {
      profileName = profileNameOrStartUrl
    }
    if (!profileName) {
      if (isStartUrl) {
        throw new Error(`Could not find and profiles configured for ${profileNameOrStartUrl}`)
      } else {
        throw new Error('You must specificy a profile when multiple AWS SSO endpoints are configured')
      }
    }
    if (!profiles[profileName]) {
      profiles[profileName] = config[`profile ${profileName}`]
      profiles[profileName].name = profileName
    }
    if (!profiles[profileName]) {
      throw new Error(`No profile found for ${profileName}`)
    }
    const profile = profiles[profileName]
    profile.name = profileName
    return AwsSso.fromResolvedProfiles(profile, profiles, forceLogin)
  }

  public get startUrl(): string {
    return this._profile.sso_start_url
  }

  public get profile(): string {
    return this._profile.name
  }

  public get profiles(): string[] {
    return Object.keys(this._profiles).map(x => this._profiles[x].name)
  }

  public async getCredentials (): Promise<RoleCredential> {
    this._session = isExpired(this._session.expiresAt)
      ? await login(this._profile, true)
      : this._session
    const sso = new SSOClient({ region: this._profile.sso_region })
    const cmd = new GetRoleCredentialsCommand({
      accessToken: this._session.accessToken,
      accountId: this._profile.sso_account_id,
      roleName: this._profile.sso_role_name
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

  public async updateCredentials (): Promise<void> {
    const config = await readConfig<Credential>(AWS_CREDENTIALS_FILE)
    for (const profileName in this._profiles) {
      const currentProfile = this._profiles[profileName]
      const credentials = await this.getCredentials()
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
    await writeConfig(AWS_CREDENTIALS_FILE, config)
  }
  
  public async exportCredentials (format: 'dotenv' | 'export'): Promise<string> {
    const credentials = await this.getCredentials()
    const prefix = format === 'export' ? 'export ' : ''
    const nawssoMarker = `${prefix}NAWSSO_AWS_ACCESS_KEY_ID=${credentials.accessKeyId}\n`
    const key = `${prefix}AWS_ACCESS_KEY_ID=${credentials.accessKeyId}\n`
    const secret = `${prefix}AWS_SECRET_ACCESS_KEY=${credentials.secretAccessKey}\n`
    const token = `${prefix}AWS_SESSION_TOKEN=${credentials.sessionToken}\n`
    return nawssoMarker + key + secret + token
  }
}

export { AwsSso }