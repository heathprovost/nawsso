import { platform } from 'process'
import { join } from 'path'
import { launch } from 'puppeteer'
import { isWsl, tmpdir } from './wsl'

async function open (startUrl: string, waitForPath: string): Promise<boolean> {
  if (platform === 'win32' || isWsl()) {
    const browser = await launch({
      channel: 'chrome',
      headless: false,
      userDataDir: join(tmpdir(), 'nawsso_puppeteer_profile'),
      args: ['--start-maximized']
    })
    const page = (await browser.pages())[0]
    await page.setViewport({ width: 0, height: 0 })
    await page.goto(startUrl)
    const result = await page.waitForRequest(async req => req.url().endsWith(waitForPath), {
      timeout: 1000 * 300 // 5 minutes
    })
    await browser.close()
    return result.response()?.ok() ?? false
  } else {
    throw new Error('YIKES!!!')
  }
}

export {
  open
}
