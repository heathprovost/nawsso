import { spawn as nodeSpawn } from 'child_process'
import { BufferList } from 'bl'

async function spawn (command: string, args?: readonly string[], options?: any): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const child = nodeSpawn(command, args, options)
    const stdout = new BufferList()
    const stderr = new BufferList()
    if (child.stdout != null) {
      child.stdout.on('data', data => {
        stdout.append(data)
      })
    }
    if (child.stderr != null) {
      child.stderr.on('data', data => {
        stderr.append(data)
      })
    }
    child.on('error', reject)
    child.on('close', code => {
      if (code === 0) {
        resolve(stdout.toString().trim())
      } else {
        const err = new Error(`child exited with code ${code ?? 'undefined'}`)
        reject(err)
      }
    })
  })
}

export {
  spawn
}
