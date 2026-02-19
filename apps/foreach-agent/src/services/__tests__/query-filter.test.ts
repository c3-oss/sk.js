import { describe, expect, it } from 'vitest'

import { filterWithQuery } from '../query-filter.js'

describe('filterWithQuery', () => {
  const items = [
    { id: 'a', count: 1, text: 'hello', enabled: true },
    { id: 'b', count: 3, text: 'world', enabled: false },
    { id: 'c', count: 5, text: 'hello world', enabled: true },
  ] as const

  it('returns all items for empty query', () => {
    const result = filterWithQuery(
      items,
      '',
      (item) => ({ count: item.count }),
      (item) => item.id,
    )
    expect(result).toEqual(items)
  })

  it('filters with boolean and numeric comparisons', () => {
    const result = filterWithQuery(
      items,
      'enabled and count >= 3',
      (item) => ({ enabled: item.enabled, count: item.count }),
      (item) => item.id,
    )
    expect(result).toEqual([items[2]])
  })

  it('supports multiline queries', () => {
    const result = filterWithQuery(
      items,
      'count >= 3\nand text ~= "world"',
      (item) => ({ count: item.count, text: item.text }),
      (item) => item.id,
    )
    expect(result).toEqual([items[1], items[2]])
  })

  it('throws for invalid query expression', () => {
    expect(() =>
      filterWithQuery(
        items,
        'count >>> 2',
        (item) => ({ count: item.count }),
        (item) => item.id,
      ),
    ).toThrow('invalid query')
  })
})
