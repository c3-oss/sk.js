import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

import type { PyProjectData, PyProjectManager } from './pyproject-parser.js'
import type { UpdateInfo } from './version-utils.js'

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const updatePyProjectFile = async (
  pyproject: PyProjectData,
  updates: readonly UpdateInfo[],
): Promise<number> => {
  const updatesToApply = updates.filter((update) => update.shouldUpdate)

  if (updatesToApply.length === 0) {
    return 0
  }

  let content = pyproject.rawContent

  for (const update of updatesToApply) {
    const { dependency, newConstraint } = update
    const { rawConstraint, name, location } = dependency

    if (pyproject.format === 'poetry') {
      const pattern = new RegExp(`(${escapeRegex(name)}\\s*=\\s*["'])${escapeRegex(rawConstraint)}(["'])`, 'g')
      content = content.replace(pattern, `$1${newConstraint}$2`)

      const tablePattern = new RegExp(
        `(${escapeRegex(name)}\\s*=\\s*\\{[^}]*version\\s*=\\s*["'])${escapeRegex(rawConstraint)}(["'])`,
        'g',
      )
      content = content.replace(tablePattern, `$1${newConstraint}$2`)
    } else {
      const oldDependency = location.key
      const newDependency = oldDependency.replace(rawConstraint, newConstraint)
      content = content.replace(`"${oldDependency}"`, `"${newDependency}"`)
      content = content.replace(`'${oldDependency}'`, `'${newDependency}'`)
    }
  }

  await fs.writeFile(pyproject.filePath, content, 'utf-8')

  return updatesToApply.length
}

const collectOutput = (
  command: string,
  args: readonly string[],
  cwd: string,
): Promise<{ output: string; error?: string }> =>
  new Promise((resolve) => {
    const childProcess = spawn(command, args, { cwd })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []

    childProcess.stdout.on('data', (chunk: Buffer) => stdout.push(chunk))
    childProcess.stderr.on('data', (chunk: Buffer) => stderr.push(chunk))
    childProcess.on('error', (error) => resolve({ output: '', error: error.message }))
    childProcess.on('close', (code) => {
      const output = Buffer.concat(stdout).toString('utf-8')
      const errorOutput = Buffer.concat(stderr).toString('utf-8')

      if (code !== 0) {
        resolve({ output, error: errorOutput || `${command} exited with code ${code}` })
        return
      }

      resolve({ output })
    })
  })

export const runSyncCommand = async (
  filePath: string,
  manager: PyProjectManager,
): Promise<{ output: string; error?: string }> => {
  const cwd = path.dirname(filePath)

  if (manager === 'poetry') {
    return collectOutput('poetry', ['lock'], cwd)
  }

  return collectOutput('uv', ['sync'], cwd)
}
