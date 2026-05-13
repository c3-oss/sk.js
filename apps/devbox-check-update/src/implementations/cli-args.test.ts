import { describe, expect, it } from 'vitest'

import { parseArgs } from './cli-args.js'

describe('cli-args', () => {
  it('defaults to ./devbox.json with no packages', () => {
    expect(parseArgs([])).toEqual({
      targetPath: './devbox.json',
      packages: [],
      dryRun: false,
      install: false,
      allProjects: false,
      syncLock: false,
      quiet: false,
      help: false,
    })
  })

  it('treats a path-like first positional as target path', () => {
    expect(parseArgs(['./project', 'nodejs', 'go'])).toEqual(
      expect.objectContaining({
        targetPath: './project',
        packages: ['nodejs', 'go'],
      }),
    )
  })

  it('treats an existing bare directory as target path', () => {
    expect(parseArgs(['src', 'nodejs'])).toEqual(
      expect.objectContaining({
        targetPath: 'src',
        packages: ['nodejs'],
      }),
    )
  })

  it('treats non-path positionals as package filters', () => {
    expect(parseArgs(['nodejs', 'go'])).toEqual(
      expect.objectContaining({
        targetPath: './devbox.json',
        packages: ['nodejs', 'go'],
      }),
    )
  })

  it('parses supported flags', () => {
    expect(
      parseArgs(['devbox.json', '--dry-run', '--install', '--all-projects', '--sync-lock', '-q', '--environment=prod']),
    ).toEqual(
      expect.objectContaining({
        targetPath: 'devbox.json',
        dryRun: true,
        install: true,
        allProjects: true,
        syncLock: true,
        quiet: true,
        environment: 'prod',
      }),
    )
  })

  it('throws on unknown options', () => {
    expect(() => parseArgs(['--wat'])).toThrow('Unknown option: --wat')
  })
})
