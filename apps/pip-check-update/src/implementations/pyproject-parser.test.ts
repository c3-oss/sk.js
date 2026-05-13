import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { detectManager, detectParsedFormat, parsePyProject } from './pyproject-parser.js'

const writeTempPyProject = async (content: string): Promise<string> => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'pip-check-update-parser-'))
  const filePath = path.join(directory, 'pyproject.toml')
  await fs.writeFile(filePath, content, 'utf-8')

  return filePath
}

describe('pyproject-parser', () => {
  describe('detectParsedFormat', () => {
    it('detects Poetry format from tool.poetry', () => {
      expect(detectParsedFormat({ tool: { poetry: { name: 'test' } } })).toBe('poetry')
    })

    it('defaults to uv for PEP 621 projects', () => {
      expect(detectParsedFormat({ project: { name: 'test' } })).toBe('uv')
    })
  })

  describe('parsePyProject', () => {
    it('parses Poetry dependencies and groups', async () => {
      const filePath = await writeTempPyProject(`
[tool.poetry]
name = "demo"

[tool.poetry.dependencies]
python = "^3.12"
requests = "^2.28.0"
fastapi = { version = "~0.110.0", extras = ["standard"] }

[tool.poetry.group.dev.dependencies]
pytest = "^8.0.0"
`)

      const pyproject = await parsePyProject(filePath)

      expect(pyproject.format).toBe('poetry')
      expect(pyproject.manager).toBe('poetry')
      expect(pyproject.dependencies).toEqual([
        expect.objectContaining({ name: 'requests', currentVersion: '2.28.0', group: 'main' }),
        expect.objectContaining({ name: 'fastapi', currentVersion: '0.110.0', group: 'main' }),
        expect.objectContaining({ name: 'pytest', currentVersion: '8.0.0', group: 'dev' }),
      ])
    })

    it('parses uv dependencies, optional dependencies, dependency groups, extras, and markers', async () => {
      const filePath = await writeTempPyProject(`
[project]
name = "demo"
dependencies = [
  "requests>=2.28.0; python_version >= '3.12'",
  "fastapi[standard]>=0.110.0,<1.0.0",
]

[project.optional-dependencies]
dev = ["pytest==8.0.0"]

[dependency-groups]
lint = ["ruff>=0.6.0"]
`)

      const pyproject = await parsePyProject(filePath)

      expect(pyproject.format).toBe('uv')
      expect(pyproject.manager).toBe('uv')
      expect(pyproject.dependencies).toEqual([
        expect.objectContaining({
          name: 'requests',
          currentVersion: '2.28.0',
          rawConstraint: '>=2.28.0',
          group: 'main',
        }),
        expect.objectContaining({
          name: 'fastapi',
          currentVersion: '0.110.0',
          rawConstraint: '>=0.110.0,<1.0.0',
          group: 'main',
        }),
        expect.objectContaining({ name: 'pytest', currentVersion: '8.0.0', rawConstraint: '==8.0.0', group: 'dev' }),
        expect.objectContaining({ name: 'ruff', currentVersion: '0.6.0', group: 'lint' }),
      ])
    })

    it('keeps PEP 621 parsing when poetry.lock selects the Poetry manager', async () => {
      const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'pip-check-update-parser-'))
      const filePath = path.join(directory, 'pyproject.toml')
      await fs.writeFile(path.join(directory, 'poetry.lock'), '', 'utf-8')
      await fs.writeFile(
        filePath,
        `
[project]
name = "demo"
dependencies = ["requests>=2.28.0"]
`,
        'utf-8',
      )

      const parsed = { project: { name: 'demo' } }

      await expect(detectManager(parsed, filePath)).resolves.toBe('poetry')
      await expect(parsePyProject(filePath)).resolves.toEqual(
        expect.objectContaining({
          format: 'uv',
          manager: 'poetry',
          dependencies: [expect.objectContaining({ name: 'requests' })],
        }),
      )
    })
  })
})
