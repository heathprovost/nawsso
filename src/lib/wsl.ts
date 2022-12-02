import { release, homedir as nodeHomeDir, tmpdir as nodeTmpDir } from 'os'
import { join } from 'path'
import { readFileSync } from 'fs'
import { execSync } from 'child_process'

let IN_WSL2: boolean = false
let FROM_WSL2: boolean = false
let HOME_DIR: string
let TEMP_DIR: string

try {
  IN_WSL2 = (process.platform === 'linux' && release().toLowerCase().includes('microsoft')) ||
            readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft')
  FROM_WSL2 = IN_WSL2 && process.argv[1]?.startsWith('/mnt/')
} catch (_) { }

if (FROM_WSL2) {
  const winhome = execSync('wslvar USERPROFILE').toString().trim()
  const wslhome = execSync(`wslpath ${winhome}`).toString().trim()
  HOME_DIR = wslhome
  TEMP_DIR = join(wslhome, 'AppData', 'Local', 'Temp')
} else {
  HOME_DIR = nodeHomeDir()
  TEMP_DIR = nodeTmpDir()
}

function platform (): string {
  if (FROM_WSL2) {
    return 'win32-wsl2'
  } else if (IN_WSL2) {
    return 'linux-wsl2'
  } else {
    return process.platform
  }
}

function homedir (): string {
  return HOME_DIR
}

function tmpdir (): string {
  return TEMP_DIR
}

export {
  platform,
  homedir,
  tmpdir
}
