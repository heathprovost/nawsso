import { RoleCredentials } from "@aws-sdk/client-sso"

type Output = 'json' | 'yaml' | 'text' | 'table'

type Region =
  | 'us-east-1'
  | 'us-east-2'
  | 'us-west-1'
  | 'us-west-2'
  | 'us-gov-east-1'
  | 'us-gov-west-1'
  | 'af-south-1'
  | 'ap-east-1'
  | 'ap-northeast-1'
  | 'ap-northeast-2'
  | 'ap-northeast-3'
  | 'ap-south-1'
  | 'ap-southeast-1'
  | 'ap-southeast-2'
  | 'ca-central-1'
  | 'cn-north-1'
  | 'cn-northwest-1'
  | 'eu-central-1'
  | 'eu-north-1'
  | 'eu-south-1'
  | 'eu-west-1'
  | 'eu-west-2'
  | 'eu-west-3'
  | 'me-south-1'
  | 'sa-east-1'

interface Profiles {
  selected: Profile
  profiles: {
    [key: string]: Profile
  }
}  
interface Profile {
  name: string
  output: Output
  region: Region
  sso_account_id: string
  sso_region: Region
  sso_role_name: string
  sso_start_url: string
}

interface ParsedConfig<T> {
  [key: string]: T
}

interface Credential {
  region?: Region
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
  
interface CachedCredential {
  accessToken: string
  expiresAt: string
  region: Region
  startUrl: string
}

export { Profile, Profiles, ParsedConfig, Credential, RoleCredential, CachedCredential }