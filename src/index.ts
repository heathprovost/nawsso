import {Command, flags} from '@oclif/command'
import { AwsSso } from './awssso'

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
    force: flags.boolean({
      char: 'f',
      description: 'Force login even when existing session is still valid'
    }),
  }

  async run() {
    const {flags} = this.parse(NawSso)
    const sso = await AwsSso.fromProfileNameOrStartUrl(flags.starturl ?? flags.profile, flags.force)
    if (flags.export) {
      this.log(await sso.exportCredentials(flags.export))
    } else if (flags.profile) {
      await sso.updateCredentials()
      this.log(`Synchronized credentials for profile '${flags.profile}'`)
    } else {
      await sso.updateCredentials()
      this.log(`Synchronized credentials for ${sso.profiles.length} profile(s)`)
    }
  }
}

export = NawSso