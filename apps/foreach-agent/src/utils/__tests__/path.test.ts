import { describe, expect, it } from 'vitest'

import { toSafeFileName } from '../path.js'

describe('toSafeFileName', () => {
  it('converts to lowercase', () => {
    expect(toSafeFileName('MyTemplate')).toBe('mytemplate')
  })

  it('replaces special characters with hyphens', () => {
    expect(toSafeFileName('hello world!')).toBe('hello-world')
  })

  it('preserves dots, hyphens, and underscores', () => {
    expect(toSafeFileName('my-template_v2.liquid')).toBe('my-template_v2.liquid')
  })

  it('trims leading and trailing hyphens', () => {
    expect(toSafeFileName('---test---')).toBe('test')
  })

  it('returns "template" for empty string', () => {
    expect(toSafeFileName('')).toBe('template')
  })

  it('returns "template" for whitespace only', () => {
    expect(toSafeFileName('   ')).toBe('template')
  })

  it('handles already safe names', () => {
    expect(toSafeFileName('safe-name')).toBe('safe-name')
  })

  it('collapses multiple special chars into single hyphen', () => {
    expect(toSafeFileName('a @ # b')).toBe('a-b')
  })
})
