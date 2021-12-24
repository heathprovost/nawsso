import { RoleCredentials } from '@aws-sdk/client-sso'

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

interface Profile extends UnnamedProfile {
  name: string
}

interface Profiles {
  [key: string]: Profile
}

interface Credential {
  region?: string
  aws_access_key_id: string
  aws_secret_access_key: string
  aws_session_token?: string
  aws_security_token?: string
  aws_session_expiration?: string
}

interface NawssoConfigAccount {
  name: string
  id: string
  role: string
  region: string
  output: string
}

interface NawssoConfig {
  sso: {
    starturl: string
    region: string
  }
  accounts: NawssoConfigAccount[]
}


interface RoleCredential extends RoleCredentials {
  accessKeyId: string
  secretAccessKey: string
  sessionToken: string
  expiration: number
  region: string
}
  
interface LoginSession {
  accessToken: string
  expiresAt: string
  region: string
  startUrl: string
}

export {
  ParsedConfig,
  UnnamedProfile,
  Profile,
  Profiles,
  Credential,
  RoleCredential,
  LoginSession,
  NawssoConfig,
  NawssoConfigAccount
}
