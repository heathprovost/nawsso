import { release, homedir as nodeHomeDir } from 'os'
import { execSync } from 'child_process'

const USE_WINHOME = process.env.NAWSSO_USE_WINHOME_IN_WSL === 'true' && process.platform === 'linux' && release().toLowerCase().includes('microsoft-standard-wsl2')

let HOME_DIR: string = nodeHomeDir()

if (USE_WINHOME) {
  const winhome = execSync('wslvar USERPROFILE').toString().trim()
  const wslhome = execSync(`wslpath "${winhome}"`).toString().trim()
  HOME_DIR = wslhome
}

function useWinHome (): boolean {
  return USE_WINHOME
}

function homedir (): string {
  return HOME_DIR
}

export {
  useWinHome,
  homedir
}
