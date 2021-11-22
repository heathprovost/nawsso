import { SSOClient, GetRoleCredentialsCommand } from '@aws-sdk/client-sso'
import { Profile, Profiles, LoginSession, RoleCredential } from './interfaces'
import { login, loadCredentials, saveCredentials, loadProfiles, createBackup, isMatchingStartUrl, isExpired, expirationToUTCDateTimeString } from './utils'

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
    const config = await loadProfiles()
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
    const config = await loadCredentials()
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
    await createBackup()
    await saveCredentials(config)
  }
  
  public async exportCredentials (format: string): Promise<string> {
    const credentials = await this.getCredentials()
    const prefix = format === 'shell' ? 'export ' : ''
    const nawssoMarker = `${prefix}NAWSSO_AWS_ACCESS_KEY_ID=${credentials.accessKeyId}\n`
    const key = `${prefix}AWS_ACCESS_KEY_ID=${credentials.accessKeyId}\n`
    const secret = `${prefix}AWS_SECRET_ACCESS_KEY=${credentials.secretAccessKey}\n`
    const token = `${prefix}AWS_SESSION_TOKEN=${credentials.sessionToken}\n`
    return nawssoMarker + key + secret + token
  }
}

export { AwsSso }