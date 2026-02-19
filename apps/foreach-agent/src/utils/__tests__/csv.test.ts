import { describe, expect, it } from 'vitest'

import { toCsv } from '../csv.js'

describe('toCsv', () => {
  it('returns empty string for empty array', () => {
    expect(toCsv([])).toBe('')
  })

  it('converts simple rows', () => {
    const result = toCsv([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ])
    expect(result).toBe('name,age\nAlice,30\nBob,25\n')
  })

  it('escapes values with commas', () => {
    const result = toCsv([{ value: 'hello, world' }])
    expect(result).toBe('value\n"hello, world"\n')
  })

  it('escapes values with double quotes', () => {
    const result = toCsv([{ value: 'say "hi"' }])
    expect(result).toBe('value\n"say ""hi"""\n')
  })

  it('escapes values with newlines', () => {
    const result = toCsv([{ value: 'line1\nline2' }])
    expect(result).toBe('value\n"line1\nline2"\n')
  })

  it('handles missing keys with empty string', () => {
    const result = toCsv([{ a: '1', b: '2' }, { a: '3' }])
    expect(result).toContain('3,')
  })
})
