import path from 'node:path'

import fs from 'fs-extra'

/**
 * Minimal package metadata used by ecsenv runtime helpers.
 */
export interface PackageJson {
  /** Package name from package.json. */
  name: string
  /** Package description from package.json. */
  description: string
  /** Package version from package.json. */
  version: string
}

/**
 * Removes the npm scope from a package name when present.
 */
const extractNameFromScopedPackage = (name: string): string => {
  if (!name.includes('/')) {
    return name
  }

  const segs = name.split('/')
  return segs[1] ?? segs[0] ?? ''
}

/**
 * Absolute root directory for the ecsenv package.
 */
export const rootDirectory = path.resolve(import.meta.dirname, '..')

/**
 * Parsed package.json metadata for the ecsenv package.
 */
export const packageJson = JSON.parse(fs.readFileSync(path.join(rootDirectory, 'package.json'), 'utf8')) as PackageJson

/**
 * Runtime metadata derived from package.json.
 */
export const meta = {
  name: extractNameFromScopedPackage(packageJson.name),
  packageJson,
  rootDirectory,
}

export default meta
