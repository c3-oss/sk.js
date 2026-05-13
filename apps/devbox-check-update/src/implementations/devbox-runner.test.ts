import { describe, expect, it } from 'vitest'

import { buildDevboxUpdateArgs } from './devbox-runner.js'

describe('devbox-runner', () => {
  it('builds a no-install update command by default', () => {
    expect(
      buildDevboxUpdateArgs({
        projectDir: '/tmp/project',
        packages: [],
        install: false,
        allProjects: false,
        syncLock: false,
        quiet: false,
      }),
    ).toEqual(['update', '--config', '/tmp/project', '--no-install'])
  })

  it('omits --no-install when install is true', () => {
    expect(
      buildDevboxUpdateArgs({
        projectDir: '/tmp/project',
        packages: [],
        install: true,
        allProjects: false,
        syncLock: false,
        quiet: false,
      }),
    ).toEqual(['update', '--config', '/tmp/project'])
  })

  it('passes supported flags and package filters', () => {
    expect(
      buildDevboxUpdateArgs({
        projectDir: '/tmp/project',
        packages: ['nodejs', 'go'],
        install: false,
        allProjects: true,
        syncLock: true,
        environment: 'prod',
        quiet: true,
      }),
    ).toEqual([
      'update',
      '--config',
      '/tmp/project',
      '--no-install',
      '--all-projects',
      '--sync-lock',
      '--environment',
      'prod',
      '--quiet',
      'nodejs',
      'go',
    ])
  })
})
