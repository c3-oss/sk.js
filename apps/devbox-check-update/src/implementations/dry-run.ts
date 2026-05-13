import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import type { DevboxUpdateOptions } from './devbox-runner.js'
import { runDevboxUpdate } from './devbox-runner.js'

export interface DryRunResult {
  changedFiles: string[]
  output: string
  error?: string
}

export type DryRunUpdateRunner = (options: DevboxUpdateOptions) => Promise<{ output: string; error?: string }>

const optionalRead = async (filePath: string): Promise<string | undefined> => {
  try {
    return await fs.readFile(filePath, 'utf-8')
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined
    }

    throw error
  }
}

const optionalCopy = async (source: string, destination: string): Promise<void> => {
  try {
    await fs.copyFile(source, destination)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return
    }

    throw error
  }
}

export const diffDevboxFiles = async (beforeDir: string, afterDir: string): Promise<string[]> => {
  const changedFiles: string[] = []

  for (const fileName of ['devbox.json', 'devbox.lock']) {
    const before = await optionalRead(path.join(beforeDir, fileName))
    const after = await optionalRead(path.join(afterDir, fileName))

    if (before !== after) {
      changedFiles.push(fileName)
    }
  }

  return changedFiles
}

export const runDryDevboxUpdate = async (
  sourceProjectDir: string,
  options: DevboxUpdateOptions,
  runner: DryRunUpdateRunner = runDevboxUpdate,
): Promise<DryRunResult> => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devbox-check-update-'))
  try {
    await optionalCopy(path.join(sourceProjectDir, 'devbox.json'), path.join(tempDir, 'devbox.json'))
    await optionalCopy(path.join(sourceProjectDir, 'devbox.lock'), path.join(tempDir, 'devbox.lock'))

    const result = await runner({
      ...options,
      projectDir: tempDir,
      install: false,
    })
    const changedFiles = await diffDevboxFiles(sourceProjectDir, tempDir)

    return {
      changedFiles,
      output: result.output,
      error: result.error,
    }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}
