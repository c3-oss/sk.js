import { compare, major, valid } from '@renovatebot/pep440'

import type { PyPIPackageInfo } from './pypi-client.js'
import type { ParsedDependency, PyProjectFormat } from './pyproject-parser.js'

export interface UpdateInfo {
  dependency: ParsedDependency
  latestVersion: string
  shouldUpdate: boolean
  isMajorBump: boolean
  newConstraint: string
}

const isComparableVersion = (version: string): boolean => valid(version) !== null

const isMajorVersionBump = (current: string, latest: string): boolean => {
  if (!isComparableVersion(current) || !isComparableVersion(latest)) {
    return false
  }

  return major(latest) > major(current)
}

const generatePoetryConstraint = (oldConstraint: string, newVersion: string): string => {
  if (oldConstraint.startsWith('^')) {
    return `^${newVersion}`
  }

  if (oldConstraint.startsWith('~')) {
    return `~${newVersion}`
  }

  return newVersion
}

const generatePEP508Constraint = (oldConstraint: string, newVersion: string): string => {
  if (oldConstraint.includes('~=')) {
    return `~=${newVersion}`
  }

  if (oldConstraint.includes(',<')) {
    return `>=${newVersion},<${major(newVersion) + 1}.0.0`
  }

  if (oldConstraint.includes('==')) {
    return `==${newVersion}`
  }

  return `>=${newVersion}`
}

export const analyzeUpdate = (
  dependency: ParsedDependency,
  pypiInfo: PyPIPackageInfo | null,
  format: PyProjectFormat,
  allowMajor: boolean,
): UpdateInfo => {
  if (pypiInfo === null) {
    return {
      dependency,
      latestVersion: 'N/A',
      shouldUpdate: false,
      isMajorBump: false,
      newConstraint: dependency.rawConstraint,
    }
  }

  const { currentVersion, rawConstraint } = dependency
  const { latestVersion } = pypiInfo

  if (!isComparableVersion(currentVersion) || !isComparableVersion(latestVersion)) {
    return {
      dependency,
      latestVersion,
      shouldUpdate: false,
      isMajorBump: false,
      newConstraint: rawConstraint,
    }
  }

  if (compare(currentVersion, latestVersion) >= 0) {
    return {
      dependency,
      latestVersion,
      shouldUpdate: false,
      isMajorBump: false,
      newConstraint: rawConstraint,
    }
  }

  const isMajorBump = isMajorVersionBump(currentVersion, latestVersion)
  if (isMajorBump && !allowMajor) {
    return {
      dependency,
      latestVersion,
      shouldUpdate: false,
      isMajorBump,
      newConstraint: rawConstraint,
    }
  }

  const newConstraint =
    format === 'poetry'
      ? generatePoetryConstraint(rawConstraint, latestVersion)
      : generatePEP508Constraint(rawConstraint, latestVersion)

  return {
    dependency,
    latestVersion,
    shouldUpdate: true,
    isMajorBump,
    newConstraint,
  }
}

export const formatUpdateTable = (updates: readonly UpdateInfo[]): string => {
  const lines: string[] = []

  lines.push('')
  lines.push(`${'Package'.padEnd(30) + 'Current'.padEnd(15) + 'Latest'.padEnd(15)}Status`)
  lines.push('-'.repeat(75))

  for (const update of updates) {
    const { dependency, latestVersion, shouldUpdate, isMajorBump } = update

    let status = 'UP TO DATE'
    if (shouldUpdate) {
      status = isMajorBump ? 'UPDATE (major)' : 'UPDATE'
    } else if (isMajorBump) {
      status = 'SKIP (major)'
    } else if (latestVersion === 'N/A') {
      status = 'NOT FOUND'
    }

    lines.push(dependency.name.padEnd(30) + dependency.currentVersion.padEnd(15) + latestVersion.padEnd(15) + status)
  }

  lines.push('')

  return lines.join('\n')
}
