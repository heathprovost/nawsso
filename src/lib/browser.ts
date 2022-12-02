import { tmpdir } from 'os'
import { join, normalize } from 'path'
import { mkdir } from 'fs/promises'
import { launch, LaunchedChrome } from 'chrome-launcher'
import { platform } from './wsl'
import CDP from 'chrome-remote-interface'

const PLATFORM = platform()

async function waitForUrl (browser: LaunchedChrome, url: string | RegExp, timeoutSeconds: number = 300): Promise<void> {
  // console.log(`${hostname()}.local`)
  const cdp = await CDP({ port: browser.port })
  const { Network, Page } = cdp
  await Network.enable({})
  await Page.enable()
  await new Promise<void>((resolve, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id)
      reject(new Error('Timeout occured waiting for approval'))
    }, timeoutSeconds * 1000)
    cdp['Network.requestWillBeSent'](params => {
      void (async () => {
        if (url instanceof RegExp ? url.test(params.documentURL) : url === params.documentURL) {
          clearTimeout(id)
          await cdp.close()
          resolve()
        }
      })()
    })
  })
}

async function tmpUserDir (profile: string): Promise<string> {
  const profilePath = normalize(join(tmpdir(), profile))
  try {
    await mkdir(profilePath)
  } catch (e: any) {
    if (e.code !== 'EEXIST') {
      throw e
    }
  }
  return profilePath
}

async function open (startUrl: string, endUrl: string | RegExp): Promise<void> {
  if (PLATFORM.includes('win32')) {
    const browser = await launch({
      startingUrl: startUrl,
      chromeFlags: ['--start-maximized'],
      userDataDir: await tmpUserDir('nawsso_profile')
    })
    await waitForUrl(browser, endUrl)
    await browser.kill()
  }
}

export {
  open
}
