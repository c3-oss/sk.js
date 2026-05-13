import fs from 'node:fs/promises'
import path from 'node:path'

/**
 * Object-form package entry from a Devbox configuration.
 */
export interface DevboxPackageMapEntry {
  /** Optional package version or constraint stored by Devbox. */
  version?: string
  /** Additional Devbox package fields preserved from the source configuration. */
  [key: string]: unknown
}

/**
 * Minimal shape of a devbox.json file needed by this package.
 */
export interface DevboxConfig {
  /** Package declarations in either array or object form. */
  packages?: unknown
  /** Additional Devbox configuration fields. */
  [key: string]: unknown
}

/**
 * Resolved Devbox project metadata and parsed configuration.
 */
export interface ResolvedDevboxProject {
  /** Absolute path to the devbox.json file. */
  configPath: string
  /** Directory containing the resolved devbox.json file. */
  projectDir: string
  /** Parsed Devbox configuration object. */
  config: DevboxConfig
}

/**
 * Normalized package declaration returned from `parseDevboxPackages`.
 */
export type DevboxPackageSpec = string | [string, string | DevboxPackageMapEntry]

/**
 * Resolves a user-supplied Devbox target to the concrete devbox.json path.
 */
export const resolveDevboxConfigPath = async (targetPath: string): Promise<string> => {
  const resolvedPath = path.resolve(targetPath)
  const stat = await fs.stat(resolvedPath)

  if (stat.isDirectory()) {
    return path.join(resolvedPath, 'devbox.json')
  }

  return resolvedPath
}

/**
 * Reads and parses JSON while preserving the file path in parse errors.
 */
const readJson = async (filePath: string): Promise<unknown> => {
  const content = await fs.readFile(filePath, 'utf-8')

  try {
    return JSON.parse(content)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Invalid JSON in ${filePath}: ${message}`)
  }
}

/**
 * Loads a Devbox project and validates that its package declarations are parseable.
 */
export const readDevboxProject = async (targetPath: string): Promise<ResolvedDevboxProject> => {
  const configPath = await resolveDevboxConfigPath(targetPath)
  const config = await readJson(configPath)

  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    throw new Error(`${configPath} must contain a JSON object`)
  }

  const project = {
    configPath,
    projectDir: path.dirname(configPath),
    config: config as DevboxConfig,
  }

  parseDevboxPackages(project.config)

  return project
}

/**
 * Parses the packages field from a Devbox configuration in array or object form.
 */
export const parseDevboxPackages = (config: DevboxConfig): DevboxPackageSpec[] => {
  const { packages } = config

  if (packages === undefined) {
    throw new Error('devbox.json does not define a packages field')
  }

  if (Array.isArray(packages)) {
    if (packages.every((entry) => typeof entry === 'string')) {
      return packages
    }

    throw new Error('devbox.json packages array must contain only strings')
  }

  if (typeof packages === 'object' && packages !== null) {
    return Object.entries(packages).map(([name, value]) => {
      if (typeof value === 'string') {
        return [name, value]
      }

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return [name, value as DevboxPackageMapEntry]
      }

      throw new Error(`devbox.json package "${name}" must be a string or object`)
    })
  }

  throw new Error('devbox.json packages must be an array or object')
}
