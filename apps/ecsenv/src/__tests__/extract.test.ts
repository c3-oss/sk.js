import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../logger.js', () => ({
  log: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
  },
}))

describe('toShellFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates sorted export statements', async () => {
    const { toShellFile } = await import('../aws/extract.js')
    const result = toShellFile({ ZOO: 'last', APP: 'first', MID: 'middle' })
    const lines = result.split('\n')
    expect(lines[0]).toBe("export APP='first'")
    expect(lines[1]).toBe("export MID='middle'")
    expect(lines[2]).toBe("export ZOO='last'")
    expect(lines[3]).toBe('') // trailing newline
  })

  it('escapes single quotes in values', async () => {
    const { toShellFile } = await import('../aws/extract.js')
    const result = toShellFile({ QUOTE: "it's a test" })
    expect(result).toContain("export QUOTE='it'\\''s a test'")
  })

  it('returns empty string for empty environment', async () => {
    const { toShellFile } = await import('../aws/extract.js')
    const result = toShellFile({})
    expect(result).toBe('')
  })

  it('skips invalid shell identifiers and logs warning', async () => {
    const { log } = await import('../logger.js')
    const { toShellFile } = await import('../aws/extract.js')

    const result = toShellFile({
      VALID_NAME: 'ok',
      '123-invalid': 'bad',
      'has space': 'bad',
      _ALSO_VALID: 'ok',
    })

    expect(result).toContain("export VALID_NAME='ok'")
    expect(result).toContain("export _ALSO_VALID='ok'")
    expect(result).not.toContain('123-invalid')
    expect(result).not.toContain('has space')
    expect(log.warn).toHaveBeenCalledTimes(2)
  })
})
