import {Command, flags} from '@oclif/command'
import { AwsSso } from './awssso'

class NawSso extends Command {
  static description = 'Node AWS SSO Credentials Helper\nSync up AWS CLI v2 SSO login session to legacy CLI v1 credentials.Invoke aws sso login and sync profile(s)'
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
    export: flags.boolean({
      char: 'e',
      dependsOn: ['profile'],
      exclusive: ['dotenv'],
      description: 'Print out AWS ENV vars in shell export format'
    }),
    dotenv: flags.boolean({
      char: 'd',
      dependsOn: ['profile'],
      exclusive: ['export'],
      description: 'Print out AWS ENV vars in .env format'
    }),
    force: flags.boolean({
      char: 'f',
      description: 'Force new session even when existing session is still valid'
    }),
  }

  async run() {
    const {flags} = this.parse(NawSso)
    const sso = await AwsSso.fromProfileNameOrStartUrl(flags.starturl ?? flags.profile, flags.force)
    if (flags.dotenv || flags.export) {
      this.log(await sso.exportCredentials(flags.export ? 'export' : 'dotenv'))
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