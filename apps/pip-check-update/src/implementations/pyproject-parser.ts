import fs from 'node:fs/promises'
import path from 'node:path'

import * as TOML from 'smol-toml'

/**
 * Supported dependency declaration formats in pyproject.toml.
 */
export type PyProjectFormat = 'poetry' | 'uv'

/**
 * Supported lock/sync managers for dependency updates.
 */
export type PyProjectManager = 'poetry' | 'uv'

/**
 * Parsed dependency with the source location needed to update the original TOML.
 */
export interface ParsedDependency {
  /** Package name as declared in pyproject.toml. */
  name: string
  /** Version extracted from the current constraint. */
  currentVersion: string
  /** Original version constraint text. */
  rawConstraint: string
  /** Dependency group name, or `main` for primary dependencies. */
  group: string
  /** TOML section and key that contain the dependency declaration. */
  location: {
    /** TOML section path containing the dependency. */
    section: string
    /** TOML key or dependency string used for replacement. */
    key: string
  }
}

/**
 * Parsed pyproject.toml content and extracted dependencies.
 */
export interface PyProjectData {
  /** Dependency declaration format detected from the parsed TOML. */
  format: PyProjectFormat
  /** Package manager selected for lockfile synchronization. */
  manager: PyProjectManager
  /** Absolute path to the pyproject.toml file. */
  filePath: string
  /** Original TOML content before any updates. */
  rawContent: string
  /** Parsed TOML object. */
  parsed: Record<string, unknown>
  /** Dependencies that include parseable version constraints. */
  dependencies: ParsedDependency[]
}

/**
 * Extracts the comparable version token from a Poetry-style constraint.
 */
const extractPoetryVersion = (constraint: string): string => {
  const match = constraint.match(/[\^~]?([0-9][0-9a-zA-Z.!+_-]*)/)

  return match?.[1] ?? ''
}

/**
 * Extracts the comparable version token from a PEP 508 constraint.
 */
const extractPEP508Version = (constraint: string): string => {
  const match = constraint.match(/[><=~!]=?\s*([0-9][0-9a-zA-Z.!+_-]*)/)

  return match?.[1] ?? ''
}

/**
 * Parses a Poetry dependency value from string or inline-table syntax.
 */
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

/**
 * Parses a uv-compatible dependency string and its version constraint.
 */
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

/**
 * Detects the lock/sync manager from TOML metadata and nearby lockfiles.
 */
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

/**
 * Detects the pyproject dependency format from parsed TOML content.
 */
export const detectParsedFormat = (parsed: Record<string, unknown>): PyProjectFormat => {
  const tool = parsed.tool as Record<string, unknown> | undefined

  return tool?.poetry !== undefined ? 'poetry' : 'uv'
}

/**
 * Backwards-compatible alias for `detectParsedFormat`.
 */
export const detectFormat = detectParsedFormat

/**
 * Extracts all parseable Poetry dependencies from the parsed TOML object.
 */
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

/**
 * Extracts all parseable uv dependencies from project and dependency-group sections.
 */
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

/**
 * Reads pyproject.toml, detects its format and manager, and extracts updateable dependencies.
 */
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
