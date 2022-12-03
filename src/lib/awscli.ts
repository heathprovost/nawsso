import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { readFile, writeFile, readdir, copyFile } from 'fs/promises'
import { parse, encode } from 'ini'
import { useWinHome, homedir } from './wsl'
import { isExpired } from './datetime'
import { spawn } from './await-spawn'

interface ParsedConfig<T> {
  [key: string]: T
}

interface Profile extends UnnamedProfile {
  name: string
}

interface UnnamedProfile {
  output: string
  region?: string
  sso_account_id: string
  sso_region: string
  sso_role_name: string
  sso_start_url: string
}

interface Credential {
  region?: string
  aws_access_key_id: string
  aws_secret_access_key: string
  aws_session_token?: string
  aws_security_token?: string
  aws_session_expiration?: string
}

interface LoginSession {
  startUrl: string
  region: string
  accessToken: string
  expiresAt: string
  clientId: string
  clientSecret: string
  registrationExpiresAt: string
}

const AWS_DIR = join(homedir(), '.aws')
const AWS_PROFILES_FILE = join(AWS_DIR, 'config')
const AWS_CREDENTIALS_FILE = process.env.AWS_SHARED_CREDENTIALS_FILE ?? join(AWS_DIR, 'credentials')
const AWS_SSO_CACHE_DIR = join(AWS_DIR, 'sso', 'cache')

async function loadJson<T> (path: string): Promise<T> {
  const data = await readFile(path, { encoding: 'utf8', flag: 'r' })
  return JSON.parse(data) as T
}

function isCredential (data: Profile | UnnamedProfile | LoginSession | unknown): data is LoginSession {
  return (data as LoginSession)?.accessToken != null && (data as LoginSession).expiresAt != null
}

async function loadCredentials (): Promise<ParsedConfig<Credential>> {
  try {
    const data = await readFile(AWS_CREDENTIALS_FILE, { encoding: 'utf8', flag: 'r' })
    return parse(data) as ParsedConfig<Credential>
  } catch (e: unknown) {
    const isNodeError = (error: unknown, code?: string): error is NodeJS.ErrnoException =>
      error instanceof Error && (code == null || (error as NodeJS.ErrnoException).code === code)
    if (isNodeError(e, 'ENOENT')) {
      return {}
    } else {
      throw e
    }
  }
}

async function saveCredentials (config: ParsedConfig<Credential>): Promise<void> {
  const data = encode(config, { whitespace: true })
  await writeFile(AWS_CREDENTIALS_FILE, data, { encoding: 'utf8', flag: 'w' })
}

async function loadProfiles (): Promise<ParsedConfig<UnnamedProfile>> {
  try {
    const data = await readFile(AWS_PROFILES_FILE, { encoding: 'utf8', flag: 'r' })
    return parse(data) as ParsedConfig<UnnamedProfile>
  } catch (e: unknown) {
    const isNodeError = (error: unknown, code?: string): error is NodeJS.ErrnoException =>
      error instanceof Error && (code == null || (error as NodeJS.ErrnoException).code === code)
    if (isNodeError(e, 'ENOENT')) {
      if (!existsSync(AWS_DIR)) {
        mkdirSync(AWS_DIR)
      }
      return {}
    } else {
      throw e
    }
  }
}

async function saveProfiles (config: ParsedConfig<UnnamedProfile>): Promise<void> {
  const data = encode(config, { whitespace: true })
  await writeFile(AWS_PROFILES_FILE, data, { encoding: 'utf8', flag: 'w' })
}

async function createBackup (filename: string = AWS_CREDENTIALS_FILE): Promise<void> {
  const backupPath = `${filename}.nawsso.backup`
  try {
    await copyFile(filename, backupPath)
  } catch (e: unknown) {
    const isNodeError = (error: unknown, code?: string): error is NodeJS.ErrnoException =>
      error instanceof Error && (code == null || (error as NodeJS.ErrnoException).code === code)
    if (!isNodeError(e, 'ENOENT')) {
      throw e
    }
  }
}

async function getCachedLoginSession (profile: Profile): Promise<LoginSession | undefined> {
  let files: string[] = []
  try {
    files = (await readdir(AWS_SSO_CACHE_DIR)).map(x => join(AWS_SSO_CACHE_DIR, x))
    files = files.filter(x => !x.includes('botocore-client'))
  } catch (_e) {}
  if (files.length === 0) return undefined
  for (const file of files) {
    const data = await loadJson<unknown>(file)
    if (
      isCredential(data) &&
      data.startUrl === profile.sso_start_url
    ) {
      return isExpired(data.expiresAt)
        ? undefined
        : data
    }
  }
}

async function login (profile: Profile, forceLogin: boolean = false): Promise<LoginSession> {
  let session = await getCachedLoginSession(profile)
  if (!forceLogin && session != null) return session
  const awsBin = useWinHome() ? 'aws.exe' : 'aws'
  await spawn(awsBin, ['sso', 'login', '--profile', profile.name], { stdio: [process.stdin, process.stdout] })
  session = await getCachedLoginSession(profile)
  if (session != null) return session
  throw new Error('Unknown error occurred during login, try running `aws sso login` manually and try again')
}

export {
  loadCredentials,
  saveCredentials,
  loadProfiles,
  saveProfiles,
  createBackup,
  login,
  Profile,
  LoginSession
}
