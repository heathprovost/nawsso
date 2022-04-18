import { release, homedir } from 'os'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import { readFile, writeFile, copyFile, readdir } from 'fs/promises'
import * as spawn from 'await-spawn'
import { parse, encode } from 'ini'
import { ParsedConfig, Profile, UnnamedProfile, LoginSession, Credential, NawssoConfig, NawssoResolvedConfig } from './interfaces'

const AWS_PROFILES_FILE = join(homedir(), '.aws', 'config')
const AWS_CREDENTIALS_FILE = process.env.AWS_SHARED_CREDENTIALS_FILE || join(homedir(), '.aws', 'credentials')
const AWS_SSO_CACHE_DIR = join(homedir(), '.aws', 'sso', 'cache')

function objectMap (obj: object, fn: (value: any) => any ): any {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v)]))
}

function isWsl (): boolean {
  try {
    if (process.platform !== 'linux') {
      return false
    }  
    if (release().toLowerCase().includes('microsoft')) {
      return true
    }
    return readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft')
  } catch (_) {
    return false
  }
}

async function loadJson<T> (path: string): Promise<T> {
  const data = await readFile(path, { encoding: 'utf8', flag: 'r'})
  return JSON.parse(data) as T
}

async function ensureAwsConfig (): Promise<void> {
  if (!existsSync(AWS_SSO_CACHE_DIR)) {
    let HOME_DIR: string
    if (isWsl() && process.argv[1]?.startsWith('/mnt/')) {
      const winHome = (await spawn('wslvar', ['USERPROFILE'])).toString().trim()
      HOME_DIR = (await spawn('wslpath', [winHome])).toString().trim()
    } else {
      HOME_DIR = homedir()
    }
    const awsSsoCacheDir = join(HOME_DIR, '.aws', 'sso', 'cache')      
    mkdirSync(awsSsoCacheDir, { recursive: true })
  }
  if (!existsSync(AWS_CREDENTIALS_FILE)) {
    await saveCredentials({})
  }
  if (!existsSync(AWS_PROFILES_FILE)) {
    await saveProfiles({})
  }
}

async function loadCredentials (): Promise<ParsedConfig<Credential>> {
  const data = await readFile(AWS_CREDENTIALS_FILE, { encoding: 'utf8', flag: 'r'})
  return parse(data) as ParsedConfig<Credential>
}

async function saveCredentials (config: ParsedConfig<Credential>): Promise<void> {
  const data = encode(config, { whitespace: true })
  await writeFile(AWS_CREDENTIALS_FILE, data, { encoding: 'utf8', flag: 'w' })
}

async function loadProfiles (): Promise<ParsedConfig<UnnamedProfile>> {
  const data = await readFile(AWS_PROFILES_FILE, { encoding: 'utf8', flag: 'r'})
  return parse(data) as ParsedConfig<UnnamedProfile>
}

async function saveProfiles (config: ParsedConfig<UnnamedProfile>): Promise<void> {
  const data = encode(config, { whitespace: true })
  await writeFile(AWS_PROFILES_FILE, data, { encoding: 'utf8', flag: 'w' })
}

async function loadNawssoConfig (path: string): Promise<NawssoResolvedConfig> {
  const data = await loadJson<NawssoConfig>(path)
  return {
    sso: data.sso,
    accounts: objectMap(data.accounts, x => {
      const id = (typeof x === 'string' || x instanceof String) ? x as string : x.id
      return {
        id,
        role: x.role ?? data.default_account?.role ?? (() => { throw new Error(`'role' property cannot be resovled for account with id '${id}' in nawsso.config.json`) })(),
        region: x.region ?? data.default_account?.region ?? 'us-east-1',
        output: x.output ?? data.default_account?.output ?? 'yaml'
      }
    })
  }
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
  url1 = url1?.endsWith('#/') ? url1?.slice(0, -2) : url1
  url2 = url2?.endsWith('#/') ? url2?.slice(0, -2) : url2
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

function isCredential (data: Profile | UnnamedProfile | LoginSession | unknown): data is LoginSession {
  return (data as LoginSession)?.accessToken != null && (data as LoginSession).expiresAt != null
}

async function login (profile: Profile, forceLogin: boolean = false): Promise<LoginSession> {
  let files = (await readdir(AWS_SSO_CACHE_DIR)).map(x => join(AWS_SSO_CACHE_DIR, x))
  if (forceLogin || files.length === 0) {
    await spawn('aws', ['sso', 'login', '--profile', profile.name], {stdio: [process.stdin, process.stdout]})
    files = (await readdir(AWS_SSO_CACHE_DIR)).map(x => join(AWS_SSO_CACHE_DIR, x))
  }
  for (const file of files) {
    const data = await loadJson<unknown>(file)
    if (
      isCredential(data) &&
      isMatchingStartUrl(data.startUrl, profile.sso_start_url)
    ) {
      return isExpired(data.expiresAt) 
        ? await login(profile, true) 
        : data
    }
  }
  throw new Error('Unknown error occurred during login, try running `aws sso login` manually and try again')
}

export {
  ensureAwsConfig,
  loadCredentials,
  saveCredentials,
  loadProfiles,
  saveProfiles,
  loadNawssoConfig,
  createBackup,
  isMatchingStartUrl,
  expirationToUTCDateTimeString,
  isExpired,
  isCredential,
  login
}
