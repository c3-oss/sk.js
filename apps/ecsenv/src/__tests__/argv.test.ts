import { describe, expect, it } from 'vitest'

import { getFlagValues, getLastFlagValue, hasFlag, parseArgv, requireFlag } from '../argv.js'

describe('parseArgv', () => {
  it('parses positionals', () => {
    const result = parseArgv(['clusters', 'extra'])
    expect(result.positionals).toEqual(['clusters', 'extra'])
    expect(result.flags.size).toBe(0)
  })

  it('parses --flag value pairs', () => {
    const result = parseArgv(['--cluster', 'my-cluster', '--region', 'eu-west-1'])
    expect(result.positionals).toEqual([])
    expect(result.flags.get('cluster')).toEqual(['my-cluster'])
    expect(result.flags.get('region')).toEqual(['eu-west-1'])
  })

  it('parses --flag=value syntax', () => {
    const result = parseArgv(['--cluster=my-cluster'])
    expect(result.flags.get('cluster')).toEqual(['my-cluster'])
  })

  it('parses boolean flags', () => {
    const result = parseArgv(['--help'])
    expect(result.flags.get('help')).toEqual(['true'])
  })

  it('parses -h as --help', () => {
    const result = parseArgv(['-h'])
    expect(result.flags.get('help')).toEqual(['true'])
  })

  it('supports -- positional terminator', () => {
    const result = parseArgv(['--cluster', 'x', '--', '--not-a-flag', 'positional'])
    expect(result.flags.get('cluster')).toEqual(['x'])
    expect(result.positionals).toEqual(['--not-a-flag', 'positional'])
  })

  it('treats negative numbers as values, not flags', () => {
    const result = parseArgv(['--offset', '-5'])
    expect(result.flags.get('offset')).toEqual(['-5'])
  })

  it('accumulates multi-value flags', () => {
    const result = parseArgv(['--tag', 'a', '--tag', 'b'])
    expect(result.flags.get('tag')).toEqual(['a', 'b'])
  })

  it('mixes positionals and flags', () => {
    const result = parseArgv(['extract', '--cluster', 'c', '--service', 's'])
    expect(result.positionals).toEqual(['extract'])
    expect(result.flags.get('cluster')).toEqual(['c'])
    expect(result.flags.get('service')).toEqual(['s'])
  })

  it('handles empty argv', () => {
    const result = parseArgv([])
    expect(result.positionals).toEqual([])
    expect(result.flags.size).toBe(0)
  })

  it('treats a flag followed by another flag as boolean', () => {
    const result = parseArgv(['--verbose', '--cluster', 'x'])
    expect(result.flags.get('verbose')).toEqual(['true'])
    expect(result.flags.get('cluster')).toEqual(['x'])
  })
})

describe('hasFlag', () => {
  it('returns true when flag exists', () => {
    const parsed = parseArgv(['--help'])
    expect(hasFlag(parsed, 'help')).toBe(true)
  })

  it('returns false when flag is absent', () => {
    const parsed = parseArgv([])
    expect(hasFlag(parsed, 'help')).toBe(false)
  })
})

describe('getFlagValues', () => {
  it('returns all values for a flag', () => {
    const parsed = parseArgv(['--tag', 'a', '--tag', 'b'])
    expect(getFlagValues(parsed, 'tag')).toEqual(['a', 'b'])
  })

  it('returns empty array for missing flag', () => {
    const parsed = parseArgv([])
    expect(getFlagValues(parsed, 'tag')).toEqual([])
  })
})

describe('getLastFlagValue', () => {
  it('returns the last value for a multi-value flag', () => {
    const parsed = parseArgv(['--region', 'a', '--region', 'b'])
    expect(getLastFlagValue(parsed, 'region')).toBe('b')
  })

  it('returns undefined for missing flag', () => {
    const parsed = parseArgv([])
    expect(getLastFlagValue(parsed, 'region')).toBeUndefined()
  })
})

describe('requireFlag', () => {
  it('returns the value when flag is present', () => {
    const parsed = parseArgv(['--cluster', 'my-cluster'])
    expect(requireFlag(parsed, 'cluster')).toBe('my-cluster')
  })

  it('throws when flag is missing', () => {
    const parsed = parseArgv([])
    expect(() => requireFlag(parsed, 'cluster')).toThrow('missing required flag --cluster')
  })

  it('throws when flag is boolean (no value)', () => {
    const parsed = parseArgv(['--cluster'])
    expect(() => requireFlag(parsed, 'cluster')).toThrow('missing required flag --cluster')
  })
})
