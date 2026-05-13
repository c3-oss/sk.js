import { describe, expect, it } from 'vitest'

import type { PyPIPackageInfo } from './pypi-client.js'
import type { ParsedDependency } from './pyproject-parser.js'
import { analyzeUpdate } from './version-utils.js'

describe('version-utils', () => {
  const baseDependency: ParsedDependency = {
    name: 'requests',
    currentVersion: '2.28.0',
    rawConstraint: '^2.28.0',
    group: 'main',
    location: { section: 'tool.poetry.dependencies', key: 'requests' },
  }

  const pypiInfo = (latestVersion: string): PyPIPackageInfo => ({
    name: 'requests',
    latestVersion,
    releases: [baseDependency.currentVersion, latestVersion],
  })

  it('identifies minor updates for Poetry constraints', () => {
    const result = analyzeUpdate(baseDependency, pypiInfo('2.31.0'), 'poetry', false)

    expect(result.shouldUpdate).toBe(true)
    expect(result.isMajorBump).toBe(false)
    expect(result.newConstraint).toBe('^2.31.0')
  })

  it('skips major updates unless allowed', () => {
    const result = analyzeUpdate(baseDependency, pypiInfo('3.0.0'), 'poetry', false)

    expect(result.shouldUpdate).toBe(false)
    expect(result.isMajorBump).toBe(true)
    expect(result.newConstraint).toBe('^2.28.0')
  })

  it('allows major updates when requested', () => {
    const result = analyzeUpdate(baseDependency, pypiInfo('3.0.0'), 'poetry', true)

    expect(result.shouldUpdate).toBe(true)
    expect(result.isMajorBump).toBe(true)
    expect(result.newConstraint).toBe('^3.0.0')
  })

  it('handles package not found on PyPI', () => {
    const result = analyzeUpdate(baseDependency, null, 'poetry', false)

    expect(result.shouldUpdate).toBe(false)
    expect(result.latestVersion).toBe('N/A')
  })

  it('preserves PEP 508 lower and upper bound style', () => {
    const dependency: ParsedDependency = {
      name: 'fastapi',
      currentVersion: '0.110.0',
      rawConstraint: '>=0.110.0,<1.0.0',
      group: 'main',
      location: { section: 'project.dependencies', key: 'fastapi[standard]>=0.110.0,<1.0.0' },
    }

    const result = analyzeUpdate(
      dependency,
      { name: 'fastapi', latestVersion: '0.115.0', releases: ['0.110.0', '0.115.0'] },
      'uv',
      false,
    )

    expect(result.shouldUpdate).toBe(true)
    expect(result.newConstraint).toBe('>=0.115.0,<1.0.0')
  })

  it('compares PEP 440 post releases', () => {
    const dependency: ParsedDependency = {
      name: 'demo',
      currentVersion: '1.0.0.post1',
      rawConstraint: '==1.0.0.post1',
      group: 'main',
      location: { section: 'project.dependencies', key: 'demo==1.0.0.post1' },
    }

    const result = analyzeUpdate(
      dependency,
      { name: 'demo', latestVersion: '1.0.0.post2', releases: ['1.0.0.post1', '1.0.0.post2'] },
      'uv',
      false,
    )

    expect(result.shouldUpdate).toBe(true)
    expect(result.newConstraint).toBe('==1.0.0.post2')
  })
})
