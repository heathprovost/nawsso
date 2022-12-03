import { readFile } from 'fs/promises'

interface NawssoConfigAccount {
  id: string
  role?: string
  region?: string
  output?: string
}

interface NawssoResolvedConfigAccount extends NawssoConfigAccount {
  role: string
  region: string
  output: string
}

interface NawssoConfig {
  sso: {
    starturl: string
    region: string
  }
  default_account?: {
    role?: string
    region?: string
    output?: string
  }
  accounts: {
    [key: string]: string | NawssoConfigAccount
  }
}

interface NawssoResolvedConfig extends NawssoConfig {
  accounts: {
    [key: string]: NawssoResolvedConfigAccount
  }
}

async function loadNawssoConfig (path: string): Promise<NawssoResolvedConfig> {
  try {
    const objectMap = (obj: object, fn: (value: any) => any): any => {
      return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v)]))
    }
    const json = await readFile(path, { encoding: 'utf8', flag: 'r' })
    const data: NawssoConfig = JSON.parse(json)
    return {
      sso: data.sso,
      accounts: objectMap(data.accounts, x => {
        const id = (typeof x === 'string' || x instanceof String) ? x as string : x.id
        return {
          id,
          role: x.role ?? data.default_account?.role ?? (() => { throw new Error(`'role' property cannot be resovled for account with id '${id as string}' in nawsso.config.json`) })(),
          region: x.region ?? data.default_account?.region ?? 'us-east-1',
          output: x.output ?? data.default_account?.output ?? 'yaml'
        }
      })
    }
  } catch (e: unknown) {
    const isNodeError = (error: unknown, code?: string): error is NodeJS.ErrnoException =>
      error instanceof Error && (code == null || (error as NodeJS.ErrnoException).code === code)
    if (isNodeError(e, 'ENOENT')) {
      throw new Error(`Nawsso config file '${path}' does not exist.`)
    } else {
      throw e
    }
  }
}

export {
  loadNawssoConfig
}
