import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { readFile, writeFile, copyFile } from 'fs/promises'
import { parse, encode } from 'ini'
import { homedir } from './wsl'

interface ParsedConfig<T> {
  [key: string]: T
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

const AWS_PROFILES_FILE = join(homedir(), '.aws', 'config')
const AWS_CREDENTIALS_FILE = process.env.AWS_SHARED_CREDENTIALS_FILE ?? join(homedir(), '.aws', 'credentials')
const AWS_SSO_CACHE_DIR = join(homedir(), '.aws', 'sso', 'cache')

async function ensureAwsConfig (): Promise<void> {
  if (!existsSync(AWS_SSO_CACHE_DIR)) {
    const awsSsoCacheDir = join(homedir(), '.aws', 'sso', 'cache')
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
  try {
    const data = await readFile(AWS_CREDENTIALS_FILE, { encoding: 'utf8', flag: 'r' })
    return parse(data) as ParsedConfig<Credential>
  } catch (e: unknown) {
    const isNodeError = (error: unknown, code?: string): error is NodeJS.ErrnoException =>
      error instanceof Error && (code == null || (error as NodeJS.ErrnoException).code === code)
    if (isNodeError(e, 'ENOENT')) {
      throw new Error(`AWS credentials file '${AWS_CREDENTIALS_FILE}' does not exist. Try running 'aws configure' to create it.`)
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
      throw new Error(`AWS config file '${AWS_PROFILES_FILE}' does not exist. Try running 'aws configure sso' to create your first profile.`)
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

export {
  ensureAwsConfig,
  loadCredentials,
  saveCredentials,
  loadProfiles,
  saveProfiles,
  createBackup,
  UnnamedProfile
}
