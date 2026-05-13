import fs from 'node:fs/promises'
import path from 'node:path'

import * as TOML from 'smol-toml'

export type PyProjectFormat = 'poetry' | 'uv'
export type PyProjectManager = 'poetry' | 'uv'

export interface ParsedDependency {
  name: string
  currentVersion: string
  rawConstraint: string
  group: string
  location: {
    section: string
    key: string
  }
}

export interface PyProjectData {
  format: PyProjectFormat
  manager: PyProjectManager
  filePath: string
  rawContent: string
  parsed: Record<string, unknown>
  dependencies: ParsedDependency[]
}

const extractPoetryVersion = (constraint: string): string => {
  const match = constraint.match(/[\^~]?([0-9][0-9a-zA-Z.!+_-]*)/)

  return match?.[1] ?? ''
}

const extractPEP508Version = (constraint: string): string => {
  const match = constraint.match(/[><=~!]=?\s*([0-9][0-9a-zA-Z.!+_-]*)/)

  return match?.[1] ?? ''
}

const parsePoetryDep = (name: string, value: unknown, section: string, group: string): ParsedDependency | null => {
  if (name.toLowerCase() === 'python') {
    return null
  }

  let rawConstraint = ''
  if (typeof value === 'string') {
    rawConstraint = value
  } else if (typeof value === 'object' && value !== null && 'version' in value) {
    const version = (value as { version?: unknown }).version
    if (typeof version === 'string') {
      rawConstraint = version
    }
  }

  if (rawConstraint.length === 0) {
    return null
  }

  const currentVersion = extractPoetryVersion(rawConstraint)
  if (currentVersion.length === 0) {
    return null
  }

  return {
    name,
    currentVersion,
    rawConstraint,
    group,
    location: { section, key: name },
  }
}

const parseUVDep = (depString: string, section: string, group: string): ParsedDependency | null => {
  if (depString.trim().startsWith('#')) {
    return null
  }

  const nameMatch = depString.match(/^([a-zA-Z0-9_.-]+)(?:\[.*?\])?/)
  if (!nameMatch) {
    return null
  }

  const name = nameMatch[1]
  if (name === undefined) {
    return null
  }

  const constraintMatch = depString.match(/^[a-zA-Z0-9_.-]+(?:\[.*?\])?\s*(.*)$/)
  const rawConstraint = (constraintMatch?.[1]?.split(';')[0] ?? '').trim()
  if (rawConstraint.length === 0) {
    return null
  }

  const currentVersion = extractPEP508Version(rawConstraint)
  if (currentVersion.length === 0) {
    return null
  }

  return {
    name,
    currentVersion,
    rawConstraint,
    group,
    location: { section, key: depString },
  }
}

export const detectManager = async (parsed: Record<string, unknown>, filePath: string): Promise<PyProjectManager> => {
  const tool = parsed.tool as Record<string, unknown> | undefined
  if (tool?.poetry !== undefined) {
    return 'poetry'
  }

  const projectDir = path.dirname(path.resolve(filePath))
  try {
    await fs.access(path.join(projectDir, 'poetry.lock'))
    return 'poetry'
  } catch {
    return 'uv'
  }
}

export const detectParsedFormat = (parsed: Record<string, unknown>): PyProjectFormat => {
  const tool = parsed.tool as Record<string, unknown> | undefined

  return tool?.poetry !== undefined ? 'poetry' : 'uv'
}

export const detectFormat = detectParsedFormat

const parsePoetryDependencies = (parsed: Record<string, unknown>): ParsedDependency[] => {
  const dependencies: ParsedDependency[] = []
  const tool = parsed.tool as Record<string, unknown> | undefined
  const poetry = tool?.poetry as Record<string, unknown> | undefined

  if (poetry === undefined) {
    return dependencies
  }

  const mainDependencies = poetry.dependencies as Record<string, unknown> | undefined
  if (mainDependencies !== undefined) {
    for (const [name, value] of Object.entries(mainDependencies)) {
      const dependency = parsePoetryDep(name, value, 'tool.poetry.dependencies', 'main')
      if (dependency !== null) {
        dependencies.push(dependency)
      }
    }
  }

  const groups = poetry.group as Record<string, Record<string, unknown>> | undefined
  if (groups !== undefined) {
    for (const [groupName, groupData] of Object.entries(groups)) {
      const groupDependencies = groupData.dependencies as Record<string, unknown> | undefined
      if (groupDependencies === undefined) {
        continue
      }

      for (const [name, value] of Object.entries(groupDependencies)) {
        const section = `tool.poetry.group.${groupName}.dependencies`
        const dependency = parsePoetryDep(name, value, section, groupName)
        if (dependency !== null) {
          dependencies.push(dependency)
        }
      }
    }
  }

  return dependencies
}

const parseUVDependencies = (parsed: Record<string, unknown>): ParsedDependency[] => {
  const dependencies: ParsedDependency[] = []
  const project = parsed.project as Record<string, unknown> | undefined

  const mainDependencies = project?.dependencies as string[] | undefined
  if (Array.isArray(mainDependencies)) {
    for (const depString of mainDependencies) {
      const dependency = parseUVDep(depString, 'project.dependencies', 'main')
      if (dependency !== null) {
        dependencies.push(dependency)
      }
    }
  }

  const optionalDependencies = project?.['optional-dependencies'] as Record<string, string[]> | undefined
  if (optionalDependencies !== undefined) {
    for (const [groupName, groupDependencies] of Object.entries(optionalDependencies)) {
      if (!Array.isArray(groupDependencies)) {
        continue
      }

      for (const depString of groupDependencies) {
        const section = `project.optional-dependencies.${groupName}`
        const dependency = parseUVDep(depString, section, groupName)
        if (dependency !== null) {
          dependencies.push(dependency)
        }
      }
    }
  }

  const dependencyGroups = parsed['dependency-groups'] as Record<string, string[]> | undefined
  if (dependencyGroups !== undefined) {
    for (const [groupName, groupDependencies] of Object.entries(dependencyGroups)) {
      if (!Array.isArray(groupDependencies)) {
        continue
      }

      for (const depString of groupDependencies) {
        const section = `dependency-groups.${groupName}`
        const dependency = parseUVDep(depString, section, groupName)
        if (dependency !== null) {
          dependencies.push(dependency)
        }
      }
    }
  }

  return dependencies
}

export const parsePyProject = async (filePath: string): Promise<PyProjectData> => {
  const absolutePath = path.resolve(filePath)
  const rawContent = await fs.readFile(absolutePath, 'utf-8')
  const parsed = TOML.parse(rawContent) as Record<string, unknown>
  const format = detectParsedFormat(parsed)
  const manager = await detectManager(parsed, absolutePath)
  const dependencies = format === 'poetry' ? parsePoetryDependencies(parsed) : parseUVDependencies(parsed)

  return {
    format,
    manager,
    filePath: absolutePath,
    rawContent,
    parsed,
    dependencies,
  }
}
