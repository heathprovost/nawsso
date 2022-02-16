import {Command, flags} from '@oclif/command'
import { AwsSso } from './awssso'
import { existsSync } from 'fs'

class NawSso extends Command {
  static description = 'Node AWS SSO Credentials Helper\nSync up AWS CLI v2 SSO login session to legacy CLI v1 credentials.'
  static flags = {
    help: flags.help({
      char: 'h'
    }),
    starturl: flags.string({
      char: 's',
      exclusive: ['profile'],
      description: 'Start URL. Required when more than one AWS SSO endpoint is configured'
    }),
    profile: flags.string({
      char: 'p',
      exclusive: ['starturl'],
      description: 'Login profile name. Default behavior is to sync all SSO profiles'
    }),
    export: flags.string({
      char: 'e',
      dependsOn: ['profile'],
      options: ['dotenv', 'json', 'shell'],
      description: 'Print out credentials in specified format'
    }),
    config: flags.string({
      char: 'c',
      exclusive: ['starturl', 'profile', 'export'],
      description: 'Load nawsso config file from path. Default is to load nawsso.config.json from cwd if exists.'
    }),
    force: flags.boolean({
      char: 'f',
      description: 'Force login even when existing session is still valid'
    }),
  }

  async run() {
    let sso: AwsSso
    const {flags} = this.parse(NawSso)
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
    if (flags.export) {
      this.log(await sso.exportCredentials(flags.export))
    } else {
      await sso.updateCredentials(this.log.bind(this))
    }
  }
}

export = NawSso