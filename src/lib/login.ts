import { createHash } from 'crypto'
import { join } from 'path'
import { readFile, writeFile } from 'fs/promises'
import { LoginSession } from './awssso'
import { tmpdir } from './wsl'
import { isExpired, expiresInToUTCString, expiresAtToUTCString } from './datetime'
import { SSOOIDCClient, RegisterClientCommand, StartDeviceAuthorizationCommand, CreateTokenCommand, RegisterClientCommandOutput, StartDeviceAuthorizationCommandOutput, CreateTokenCommandOutput } from '@aws-sdk/client-sso-oidc'
import { open } from './browser'

async function loadSessionFromCache (startUrl: string, region: string): Promise<LoginSession | undefined> {
  const name = 'nawsso_session_' + createHash('sha256').update(startUrl + region ?? 'us-east-1').digest('hex') + '.json'
  const cache = join(tmpdir(), name)
  try {
    const data = await readFile(cache, { encoding: 'utf8', flag: 'r' })
    const session = JSON.parse(data) as LoginSession
    return !isExpired(session.expiresAt) ? session : undefined
  } catch (e: any) {
    if (e.code !== 'ENOENT') throw (e)
  }
}

async function saveSessionToCache (session: LoginSession): Promise<void> {
  const name = 'nawsso_session_' + createHash('sha256').update(session.startUrl + session.region).digest('hex') + '.json'
  const cache = join(tmpdir(), name)
  const data = JSON.stringify(session)
  await writeFile(cache, data, { encoding: 'utf8', flag: 'w' })
}

async function registerClient (oidc: SSOOIDCClient, name: string): Promise<Required<RegisterClientCommandOutput>> {
  const cmd = new RegisterClientCommand({
    clientName: name,
    clientType: 'public',
    scopes: ['sso-portal:*']
  })
  const result = await oidc.send(cmd)
  if (
    result.clientId == null ||
    result.clientSecret == null ||
    result.clientSecretExpiresAt == null
  ) {
    throw new Error('AWS SSO registerClient() failed.')
  }
  return result as Required<RegisterClientCommandOutput>
}

async function authorizeDevice (oidc: SSOOIDCClient, registration: RegisterClientCommandOutput, startUrl: string): Promise<Required<StartDeviceAuthorizationCommandOutput>> {
  const cmd = new StartDeviceAuthorizationCommand({
    clientId: registration.clientId,
    clientSecret: registration.clientSecret,
    startUrl
  })
  const result = await oidc.send(cmd)
  if (
    result.verificationUri == null ||
    result.verificationUriComplete == null ||
    result.deviceCode == null ||
    result.userCode == null ||
    result.expiresIn == null ||
    result.interval == null
  ) {
    throw new Error('AWS SSO authorizeDevice() failed.')
  }
  return result as Required<StartDeviceAuthorizationCommandOutput>
}

async function createToken (oidc: SSOOIDCClient, authorization: Required<StartDeviceAuthorizationCommandOutput>, registration: RegisterClientCommandOutput): Promise<Required<CreateTokenCommandOutput>> {
  const cmd = new CreateTokenCommand({
    clientId: registration.clientId,
    clientSecret: registration.clientSecret,
    deviceCode: authorization.deviceCode,
    grantType: 'urn:ietf:params:oauth:grant-type:device_code'
  })
  const result = await oidc.send(cmd)
  if (
    result.accessToken == null ||
    result.expiresIn == null
  ) {
    throw new Error('AWS SSO createToken() failed')
  }
  return result as Required<CreateTokenCommandOutput>
}

async function login (startUrl: string, region: string, forceLogin: boolean = false): Promise<LoginSession> {
  let session = forceLogin ? undefined : await loadSessionFromCache(startUrl, region)
  if (session !== undefined) return session
  const oidc = new SSOOIDCClient({ region })
  const registration = await registerClient(oidc, 'nawsso')
  const authorization = await authorizeDevice(oidc, registration, startUrl)
  process.stdout.write(`Opening the SSO authorization page in bundled browser.\nIf the browser does not open or you wish to use a different device to authorize this request, open the following URL:\n\n${authorization.verificationUri}\n\nThen enter the code:\n\n${authorization.userCode}\n`)
  await open(authorization.verificationUriComplete, '/start/user-consent/login-success.html')
  process.stdout.write(`Successfully logged into Start URL: ${startUrl}\n`)
  const token = await createToken(oidc, authorization, registration)
  session = {
    startUrl,
    region,
    accessToken: token.accessToken,
    expiresAt: expiresInToUTCString(token.expiresIn),
    clientId: registration.clientId,
    clientSecret: registration.clientSecret,
    registrationExpiresAt: expiresAtToUTCString(registration.clientSecretExpiresAt)
  }
  await saveSessionToCache(session)
  return session
}

export {
  login
}
