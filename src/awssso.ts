import * as chalk from 'chalk'
import { SSOClient, GetRoleCredentialsCommand } from '@aws-sdk/client-sso'
import { Profile, Profiles, LoginSession, RoleCredential } from './interfaces'
import { ensureAwsConfig, login, loadCredentials, saveCredentials, loadProfiles, createBackup, isMatchingStartUrl, isExpired, expirationToUTCDateTimeString, saveProfiles, loadNawssoConfig } from './utils'
import { existsSync } from 'fs'

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

  public static async fromStartUrl (startUrl: string, forceLogin: boolean = false): Promise<AwsSso> {
    let profileName: string | undefined
    if (!startUrl.startsWith('https://')) {
      throw new Error(`starturl must be a valid https url`)
    }
    const profiles: Profiles = {}
    const config = await loadProfiles()
    for (const profile in config) {
      if (profile.startsWith('profile ') && isMatchingStartUrl(startUrl, config[profile].sso_start_url)) {
        profileName = profileName ?? profile.slice(8)
        const currentProfile = profile.slice(8)
        profiles[currentProfile] = {
          name: currentProfile,
          ...config[profile]
        }
      }
    }
    if (!profileName) {
      throw new Error(`Could not find any profiles configured for ${startUrl}`)
    }
    const profile = profiles[profileName]
    return AwsSso.fromResolvedProfiles(profile, profiles, forceLogin)
  }

  public static async fromAutoDetectedStartUrl (forceLogin: boolean = false): Promise<AwsSso> {
    let startUrl
    let profileName: string | undefined
    const profiles: Profiles = {}
    const config = await loadProfiles()
    for (const profile in config) {
      if (profile.startsWith('profile ')) {
        if (config[profile].sso_start_url != null) {
          startUrl = startUrl ?? config[profile].sso_start_url
          if (isMatchingStartUrl(startUrl, config[profile].sso_start_url)) {
            profileName = profileName ?? profile.slice(8)
            const currentProfile = profile.slice(8)
            profiles[currentProfile] = {
              name: currentProfile,
              ...config[profile]
            }
          } else {
            throw new Error(`You must specificy a profile when multiple AWS SSO endpoints are configured`)
          }
        }
      }
    }
    if (!profileName) {
      throw new Error(`Could not find any configured SSO profiles`)
    }
    const profile = profiles[profileName]
    return AwsSso.fromResolvedProfiles(profile, profiles, forceLogin)
  }

  public static async fromProfileName (profileName: string, forceLogin: boolean = false): Promise<AwsSso> {
    let theProfile: string | undefined
    const profiles: Profiles = {}
    const config = await loadProfiles()
    for (const profile in config) {
      if (profile.startsWith('profile ') && profile.slice(8) === profileName && config[profile].sso_start_url != null) {
        theProfile = profileName
        profiles[theProfile] = {
          name: theProfile,
          ...config[profile]
        }
      }
    }
    if (!theProfile) {
      throw new Error(`No SSO configured profile found for ${profileName}`)
    }
    const profile = profiles[theProfile]
    return AwsSso.fromResolvedProfiles(profile, profiles, forceLogin)
  }

  public static async fromNawssoConfig (path: string, forceLogin: boolean = false): Promise<AwsSso> {
    if (!existsSync(path)) {
      throw new Error(`Nawsso config file '${path}' does not exist.`)
    }
    let profileName: string | undefined
    let configModified = false
    const profiles: Profiles = {}
    await ensureAwsConfig()
    const nawssoConfig = await loadNawssoConfig(path)
    const config = await loadProfiles()
    for (const name in nawssoConfig.accounts) {
      const account = nawssoConfig.accounts[name]
      const profile = config[`profile ${name}`]
      if (
        profile == null ||
        isMatchingStartUrl(profile.sso_start_url, nawssoConfig.sso.starturl) == false ||
        profile.sso_region !== nawssoConfig.sso.region ||
        profile.sso_account_id !== account.id ||
        profile.sso_role_name !== account.role ||
        profile.region !== account.region ||
        profile.output !== account.output
      ) {
        configModified = true
        config[`profile ${name}`] = {
          sso_start_url: nawssoConfig.sso.starturl,
          sso_region: nawssoConfig.sso.region,
          sso_account_id: account.id,
          sso_role_name: account.role,
          region: account.region,
          output: account.output
        }
      }
      profileName = profileName ?? name
      profiles[name] = {
        name,
        ...config[`profile ${name}`]
      }
    }
    if (!profileName) {
      throw new Error(`Could not find any configured SSO profiles`)
    }
    const profile = profiles[profileName]
    if (configModified) {
      await saveProfiles(config)
    }
    return AwsSso.fromResolvedProfiles(profile, profiles, forceLogin)
  }


  public get startUrl(): string {
    return this._profile.sso_start_url
  }

  public get profile(): string {
    return this._profile.name!
  }

  public get profiles(): string[] {
    return Object.keys(this._profiles).map(x => this._profiles[x].name!)
  }

  public async getCredentials (profile: Profile): Promise<RoleCredential> {
    this._session = isExpired(this._session.expiresAt)
      ? await login(this._profile, true)
      : this._session
    const sso = new SSOClient({ region: profile.sso_region })
    const cmd = new GetRoleCredentialsCommand({
      accessToken: this._session.accessToken,
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
    return {...result.roleCredentials, region: profile.region} as RoleCredential
  }

  public async updateCredentials (log?: (message?: string, ...args: any[]) => void): Promise<void> {
    const config = await loadCredentials()
    let count = 0
    for (const profileName in this._profiles) {
      const currentProfile = this._profiles[profileName]
      try {
        const credentials = await this.getCredentials(currentProfile)
        config[currentProfile.name] = {
          aws_access_key_id: credentials.accessKeyId,
          aws_secret_access_key: credentials.secretAccessKey,
          aws_session_token: credentials.sessionToken,
          aws_security_token: credentials.sessionToken,
          aws_session_expiration: expirationToUTCDateTimeString(credentials.expiration)
        }
        if (credentials.region != null) {
          config[currentProfile.name].region = credentials.region
        }
        count++
      } catch (e: any) {
        if (log) {
          log(`${chalk.red(e.name + ': ' + e.message)} for profile ${chalk.green(currentProfile.name)} (id: ${chalk.green(currentProfile.sso_account_id)}, role: ${chalk.green(currentProfile.sso_role_name)})`)
        }
      }
    }
    await createBackup()
    await saveCredentials(config)
    if (log) {
      if (count === 1) {
        log(`Synchronized credentials for profile '${Object.keys(this._profiles)[0]}'`)
      } else {
        log(`Synchronized credentials for ${count} profile(s)`)
      }
    }
  }
  
  public async exportCredentials (format: string): Promise<string> {
    const credentials = await this.getCredentials(this._profile)
    if (format === 'json') {
      return JSON.stringify({
        expiration: credentials.expiration,
        accesKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        region: credentials.region,
        sessionToken: credentials.sessionToken
      }, null, 2)
    }
    const prefix = format === 'shell' ? 'export ' : ''
    const nawssoExpires = `${prefix}NAWSSO_EXPIRES=${credentials.expiration}\n`
    const key = `${prefix}AWS_ACCESS_KEY_ID=${credentials.accessKeyId}\n`
    const secret = `${prefix}AWS_SECRET_ACCESS_KEY=${credentials.secretAccessKey}\n`
    const region = (credentials.region != null) ? `${prefix}AWS_REGION=${credentials.region}\n` : ''
    const token = `${prefix}AWS_SESSION_TOKEN=${credentials.sessionToken}`
    return nawssoExpires + key + secret + region + token
  }
}

export { AwsSso }