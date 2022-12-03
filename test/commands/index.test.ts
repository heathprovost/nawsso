import { expect, test } from '@oclif/test'

describe('command', () => {

  test
  .stdout()
  .command(['.', '--help'])
  .exit(0)
  .it('shows help', ctx => {
    expect(ctx.stdout).to.contain('Node AWS SSO Credentials Helper')
  })

})
