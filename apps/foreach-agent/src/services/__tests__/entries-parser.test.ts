import { describe, expect, it } from 'vitest'

import { parseEntriesFromText } from '../entries-parser.js'

describe('parseEntriesFromText', () => {
  it('parses JSON array', () => {
    const result = parseEntriesFromText('[{"name": "Alice"}, {"name": "Bob"}]')
    expect(result).toEqual([{ name: 'Alice' }, { name: 'Bob' }])
  })

  it('parses YAML array', () => {
    const yaml = `- name: Alice
- name: Bob`
    const result = parseEntriesFromText(yaml)
    expect(result).toEqual([{ name: 'Alice' }, { name: 'Bob' }])
  })

  it('parses object with entries key', () => {
    const result = parseEntriesFromText('{"entries": [{"name": "Alice"}]}')
    expect(result).toEqual([{ name: 'Alice' }])
  })

  it('throws on empty input', () => {
    expect(() => parseEntriesFromText('')).toThrow('entries input is empty')
    expect(() => parseEntriesFromText('   ')).toThrow('entries input is empty')
  })

  it('throws on invalid input', () => {
    expect(() => parseEntriesFromText('not valid json or yaml {')).toThrow()
  })

  it('throws when array contains non-objects', () => {
    expect(() => parseEntriesFromText('["a", "b"]')).toThrow('entries must be an array of objects')
  })

  it('parses single-entry JSON array', () => {
    const result = parseEntriesFromText('[{"key": "value"}]')
    expect(result).toEqual([{ key: 'value' }])
  })
})
