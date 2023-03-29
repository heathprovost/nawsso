import { Command, Flags } from '@oclif/core'
import { existsSync } from 'fs'

export default class NawSso extends Command {
  static description = 'Node AWS SSO Credentials Helper v1.8.5\nSync up AWS CLI v2 SSO login session to legacy CLI v1 credentials.'
  static flags = {
    help: Flags.help({
      char: 'h'
    }),
    starturl: Flags.string({
      char: 's',
      exclusive: ['profile'],
      description: 'Start URL. Required when more than one AWS SSO endpoint is configured'
    }),
    profile: Flags.string({
      char: 'p',
      exclusive: ['starturl'],
      description: 'Login profile name. Default behavior is to sync all SSO profiles'
    }),
    export: Flags.string({
      char: 'e',
      dependsOn: ['profile'],
      options: ['dotenv', 'json', 'shell', 'arguments'],
      description: 'Print out credentials in specified format'
    }),
    config: Flags.string({
      char: 'c',
      exclusive: ['starturl', 'profile', 'export'],
      description: 'Load a config file from path. Default loads nawsso.config.json from cwd.'
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'Force login even when existing session is still valid'
    }),
    winhome: Flags.boolean({
      char: 'w',
      description: 'Use windows home directory when run in Windows Subsystem for Linux.'
    })
  }

  async run (): Promise<void> {
    const { flags } = await this.parse(NawSso)
    process.env.NAWSSO_USE_WINHOME_IN_WSL = flags.winhome ? 'true' : 'false'
    const { AwsSso } = await import('../lib/awssso')
    let sso: any
    if (flags.profile != null) {
      sso = await AwsSso.fromProfileName(flags.profile, flags.force)
    } else if (flags.starturl != null) {
      sso = await AwsSso.fromStartUrl(flags.starturl, flags.force)
    } else if (flags.config != null) {
      sso = await AwsSso.fromNawssoConfig(flags.config, flags.force)
    } else if (existsSync('nawsso.config.json')) {
      sso = await AwsSso.fromNawssoConfig('nawsso.config.json', flags.force)
    } else {
      sso = await AwsSso.fromAutoDetectedStartUrl(flags.force)
    }
    if (flags.export != null) {
      this.log(await sso.exportCredentials(flags.export))
    } else {
      await sso.updateCredentials(this.log.bind(this))
    }
  }
}
