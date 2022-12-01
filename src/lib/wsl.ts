import { release, homedir as nodeHomeDir, tmpdir as nodeTmpDir } from 'os'
import { join } from 'path'
import { readFileSync } from 'fs'
import { execSync } from 'child_process'

let IS_WSL: boolean = false
let HOME_DIR: string
let TEMP_DIR: string

try {
  IS_WSL = (
    (process.platform === 'linux' && release().toLowerCase().includes('microsoft')) ||
    (readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft') && process.argv[1]?.startsWith('/mnt/'))
  )
} catch (_) { }

if (IS_WSL) {
  const winhome = execSync('wslvar USERPROFILE').toString().trim()
  const wslhome = execSync(`wslpath ${winhome}`).toString().trim()
  HOME_DIR = wslhome
  TEMP_DIR = join(wslhome, 'AppData', 'Local', 'Temp')
} else {
  HOME_DIR = nodeHomeDir()
  TEMP_DIR = nodeTmpDir()
}

function isWsl (): boolean {
  return IS_WSL
}

function homedir (): string {
  return HOME_DIR
}

function tmpdir (): string {
  return TEMP_DIR
}

export {
  isWsl,
  homedir,
  tmpdir
}
