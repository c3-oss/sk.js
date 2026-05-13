import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { diffDevboxFiles, runDryDevboxUpdate } from './dry-run.js'

const makeProject = async (): Promise<string> => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'devbox-check-update-dry-'))
  await fs.writeFile(path.join(directory, 'devbox.json'), '{ "packages": ["nodejs@20"] }\n', 'utf-8')
  await fs.writeFile(path.join(directory, 'devbox.lock'), '{ "lockfile_version": "1" }\n', 'utf-8')

  return directory
}

describe('dry-run', () => {
  it('diffs devbox files', async () => {
    const beforeDir = await makeProject()
    const afterDir = await makeProject()
    await fs.writeFile(path.join(afterDir, 'devbox.lock'), '{ "lockfile_version": "2" }\n', 'utf-8')

    await expect(diffDevboxFiles(beforeDir, afterDir)).resolves.toEqual(['devbox.lock'])
  })

  it('runs updates in a temporary copy and reports changed files', async () => {
    const projectDir = await makeProject()
    const result = await runDryDevboxUpdate(
      projectDir,
      {
        projectDir,
        packages: [],
        install: true,
        allProjects: false,
        syncLock: false,
        quiet: false,
      },
      async (options) => {
        expect(options.projectDir).not.toBe(projectDir)
        expect(options.install).toBe(false)
        await fs.writeFile(path.join(options.projectDir, 'devbox.lock'), '{ "lockfile_version": "2" }\n', 'utf-8')

        return { output: 'updated' }
      },
    )

    expect(result).toEqual({
      changedFiles: ['devbox.lock'],
      output: 'updated',
      error: undefined,
    })
    await expect(fs.readFile(path.join(projectDir, 'devbox.lock'), 'utf-8')).resolves.toBe(
      '{ "lockfile_version": "1" }\n',
    )
  })
})
