function isExpired (expiresAt: string): boolean {
  const now = Date.now()
  const exp = new Date(expiresAt.replace('UTC', ''))
  const expired = now > exp.getTime()
  return expired
}

function expirationToUTCString (expiration?: number): string {
  if (expiration == null) {
    throw new Error('expirationToUTCDateTimeString: expiration not provided')
  }
  return new Date(expiration).toISOString().replace('.000Z', '+0000')
}

function expiresInToUTCString (expiresIn?: number): string {
  if (expiresIn == null) {
    throw new Error('expiresInToUTCDateTimeString: expiresIn not provided')
  }
  const dt = new Date()
  dt.setSeconds(dt.getSeconds() + expiresIn)
  dt.setMilliseconds(0)
  return dt.toISOString().replace('.000Z', 'Z')
}

function expiresAtToUTCString (expiresAt?: number): string {
  if (expiresAt == null) {
    throw new Error('expiresAtToUTCDateTimeString: expiresAt not provided')
  }
  const dt = new Date(0)
  dt.setUTCSeconds(expiresAt)
  dt.setMilliseconds(0)
  return dt.toISOString().replace('.000Z', 'Z')
}

export {
  isExpired,
  expirationToUTCString,
  expiresAtToUTCString,
  expiresInToUTCString
}
