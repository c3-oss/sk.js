import { describe, expect, it } from 'vitest'

import { parseListOutputFormat, renderTable, stringifyCell } from '../table.js'

describe('stringifyCell', () => {
  it('returns empty string for undefined', () => {
    expect(stringifyCell(undefined)).toBe('')
  })

  it('returns empty string for null', () => {
    expect(stringifyCell(null)).toBe('')
  })

  it('returns string as-is', () => {
    expect(stringifyCell('hello')).toBe('hello')
  })

  it('converts number to string', () => {
    expect(stringifyCell(42)).toBe('42')
  })

  it('converts boolean to string', () => {
    expect(stringifyCell(true)).toBe('true')
  })

  it('JSON-serializes objects', () => {
    expect(stringifyCell({ a: 1 })).toBe('{"a":1}')
  })
})

describe('renderTable', () => {
  it('returns "No results" for empty rows', () => {
    expect(renderTable([])).toBe('No results')
  })

  it('renders a single-column table', () => {
    const result = renderTable([{ name: 'alpha' }, { name: 'beta' }])
    const lines = result.split('\n')
    expect(lines).toHaveLength(4) // header + separator + 2 rows
    expect(lines[0]).toContain('name')
    expect(lines[2]).toContain('alpha')
    expect(lines[3]).toContain('beta')
  })

  it('renders a multi-column table with proper padding', () => {
    const result = renderTable([{ name: 'a', arn: 'arn:aws:ecs:us-east-1:123:cluster/short' }])
    const lines = result.split('\n')
    expect(lines[0]).toContain('name')
    expect(lines[0]).toContain('arn')
    expect(lines[1]).toMatch(/^-+\+-+-+$/)
  })
})

describe('parseListOutputFormat', () => {
  it('defaults to table when undefined', () => {
    expect(parseListOutputFormat(undefined)).toBe('table')
  })

  it('accepts "table"', () => {
    expect(parseListOutputFormat('table')).toBe('table')
  })

  it('accepts "json"', () => {
    expect(parseListOutputFormat('json')).toBe('json')
  })

  it('is case-insensitive', () => {
    expect(parseListOutputFormat('TABLE')).toBe('table')
    expect(parseListOutputFormat('JSON')).toBe('json')
  })

  it('trims whitespace', () => {
    expect(parseListOutputFormat('  table  ')).toBe('table')
  })

  it('throws for invalid format', () => {
    expect(() => parseListOutputFormat('csv')).toThrow('invalid --output-format')
  })
})
