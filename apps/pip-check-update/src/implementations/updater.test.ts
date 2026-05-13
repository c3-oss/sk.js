import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { parsePyProject } from './pyproject-parser.js'
import { updatePyProjectFile } from './updater.js'
import { analyzeUpdate } from './version-utils.js'

const writeTempPyProject = async (content: string): Promise<string> => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'pip-check-update-updater-'))
  const filePath = path.join(directory, 'pyproject.toml')
  await fs.writeFile(filePath, content, 'utf-8')

  return filePath
}

describe('updater', () => {
  it('updates Poetry string and table dependencies without reserializing TOML', async () => {
    const filePath = await writeTempPyProject(`
[tool.poetry.dependencies]
# keep this comment
requests = "^2.28.0"
fastapi = { version = "~0.110.0", extras = ["standard"] }
`)
    const pyproject = await parsePyProject(filePath)
    const updates = pyproject.dependencies.map((dependency) =>
      analyzeUpdate(
        dependency,
        {
          name: dependency.name,
          latestVersion: dependency.name === 'requests' ? '2.31.0' : '0.115.0',
          releases: [],
        },
        pyproject.format,
        false,
      ),
    )

    await updatePyProjectFile(pyproject, updates)

    await expect(fs.readFile(filePath, 'utf-8')).resolves.toContain('# keep this comment\nrequests = "^2.31.0"')
    await expect(fs.readFile(filePath, 'utf-8')).resolves.toContain(
      'fastapi = { version = "~0.115.0", extras = ["standard"] }',
    )
  })

  it('updates uv dependencies while preserving extras and markers', async () => {
    const filePath = await writeTempPyProject(`
[project]
dependencies = [
  "requests>=2.28.0; python_version >= '3.12'",
  "fastapi[standard]>=0.110.0,<1.0.0",
]
`)
    const pyproject = await parsePyProject(filePath)
    const updates = pyproject.dependencies.map((dependency) =>
      analyzeUpdate(
        dependency,
        {
          name: dependency.name,
          latestVersion: dependency.name === 'requests' ? '2.31.0' : '0.115.0',
          releases: [],
        },
        pyproject.format,
        false,
      ),
    )

    await updatePyProjectFile(pyproject, updates)
    const updated = await fs.readFile(filePath, 'utf-8')

    expect(updated).toContain('"requests>=2.31.0; python_version >= \'3.12\'"')
    expect(updated).toContain('"fastapi[standard]>=0.115.0,<1.0.0"')
  })
})
