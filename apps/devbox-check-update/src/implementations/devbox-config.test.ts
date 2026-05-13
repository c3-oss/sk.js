import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { parseDevboxPackages, readDevboxProject, resolveDevboxConfigPath } from './devbox-config.js'

const makeProject = async (content: string): Promise<string> => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'devbox-check-update-config-'))
  await fs.writeFile(path.join(directory, 'devbox.json'), content, 'utf-8')

  return directory
}

describe('devbox-config', () => {
  it('parses array packages', () => {
    expect(parseDevboxPackages({ packages: ['go@latest', 'nodejs@20'] })).toEqual(['go@latest', 'nodejs@20'])
  })

  it('parses map packages', () => {
    expect(
      parseDevboxPackages({
        packages: {
          go: 'latest',
          glibcLocales: { version: 'latest', platforms: ['x86_64-linux'] },
        },
      }),
    ).toEqual([
      ['go', 'latest'],
      ['glibcLocales', { version: 'latest', platforms: ['x86_64-linux'] }],
    ])
  })

  it('throws when packages is missing or invalid', () => {
    expect(() => parseDevboxPackages({})).toThrow('does not define a packages field')
    expect(() => parseDevboxPackages({ packages: [1] })).toThrow('packages array must contain only strings')
    expect(() => parseDevboxPackages({ packages: 'nodejs' })).toThrow('packages must be an array or object')
  })

  it('resolves directories to devbox.json', async () => {
    const directory = await makeProject('{ "packages": ["nodejs@20"] }')

    await expect(resolveDevboxConfigPath(directory)).resolves.toBe(path.join(directory, 'devbox.json'))
  })

  it('reads and validates a devbox project', async () => {
    const directory = await makeProject('{ "packages": ["nodejs@20"] }')

    await expect(readDevboxProject(directory)).resolves.toEqual(
      expect.objectContaining({
        configPath: path.join(directory, 'devbox.json'),
        projectDir: directory,
        config: { packages: ['nodejs@20'] },
      }),
    )
  })
})
