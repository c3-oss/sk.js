import { describe, expect, it } from 'vitest'

import { durationMs, formatDuration } from '../time.js'

describe('durationMs', () => {
  it('calculates duration correctly', () => {
    const result = durationMs('2024-01-01T00:00:00.000Z', '2024-01-01T00:00:05.000Z')
    expect(result).toBe(5000)
  })

  it('returns undefined when start is undefined', () => {
    expect(durationMs(undefined, '2024-01-01T00:00:00.000Z')).toBeUndefined()
  })

  it('returns undefined when end is undefined', () => {
    expect(durationMs('2024-01-01T00:00:00.000Z', undefined)).toBeUndefined()
  })

  it('returns undefined for both undefined', () => {
    expect(durationMs(undefined, undefined)).toBeUndefined()
  })

  it('returns 0 for same timestamps', () => {
    const ts = '2024-01-01T00:00:00.000Z'
    expect(durationMs(ts, ts)).toBe(0)
  })

  it('returns 0 for negative duration (clamped)', () => {
    const result = durationMs('2024-01-01T00:00:05.000Z', '2024-01-01T00:00:00.000Z')
    expect(result).toBe(0)
  })

  it('returns undefined for invalid date strings', () => {
    expect(durationMs('not-a-date', '2024-01-01T00:00:00.000Z')).toBeUndefined()
  })
})

describe('formatDuration', () => {
  it('returns dash for undefined', () => {
    expect(formatDuration(undefined)).toBe('-')
  })

  it('formats milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms')
  })

  it('formats seconds', () => {
    expect(formatDuration(5000)).toBe('5s')
  })

  it('formats minutes and seconds', () => {
    expect(formatDuration(125000)).toBe('2m 5s')
  })

  it('formats exact minutes', () => {
    expect(formatDuration(60000)).toBe('1m 0s')
  })

  it('formats zero ms', () => {
    expect(formatDuration(0)).toBe('0ms')
  })
})
