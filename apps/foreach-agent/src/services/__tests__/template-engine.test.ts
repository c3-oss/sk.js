import { describe, expect, it } from 'vitest'

import { extractTemplateVariables, renderTemplate, validateTemplateWithEntries } from '../template-engine.js'

describe('extractTemplateVariables', () => {
  it('extracts simple output variables', () => {
    const result = extractTemplateVariables('Hello {{ name }}, welcome to {{ city }}')
    expect(result).toEqual(['city', 'name'])
  })

  it('extracts root from nested dot variables', () => {
    const result = extractTemplateVariables('{{ user.name }} lives in {{ user.address.city }}')
    expect(result).toEqual(['user'])
  })

  it('deduplicates variables', () => {
    const result = extractTemplateVariables('{{ name }} and {{ name }}')
    expect(result).toEqual(['name'])
  })

  it('extracts variables from logic tags', () => {
    const result = extractTemplateVariables('{% if active %}{{ name }}{% endif %}')
    expect(result).toEqual(['active', 'name'])
  })

  it('filters out Liquid keywords', () => {
    const result = extractTemplateVariables('{% if active %}hello{% endif %}')
    expect(result).toEqual(['active'])
    expect(result).not.toContain('if')
    expect(result).not.toContain('endif')
  })

  it('filters out all common Liquid keywords', () => {
    const template =
      '{% for item in items %}{% if item.active %}{% unless hidden %}{{ item.name }}{% endunless %}{% endif %}{% endfor %}'
    const result = extractTemplateVariables(template)
    expect(result).not.toContain('for')
    expect(result).not.toContain('endfor')
    expect(result).not.toContain('if')
    expect(result).not.toContain('endif')
    expect(result).not.toContain('unless')
    expect(result).not.toContain('endunless')
    expect(result).not.toContain('in')
    expect(result).toContain('item')
    expect(result).toContain('items')
    expect(result).toContain('hidden')
  })

  it('returns empty array for no variables', () => {
    const result = extractTemplateVariables('Hello world, no variables here')
    expect(result).toEqual([])
  })

  it('returns sorted variables', () => {
    const result = extractTemplateVariables('{{ zebra }} {{ apple }} {{ mango }}')
    expect(result).toEqual(['apple', 'mango', 'zebra'])
  })

  it('filters assign and capture keywords', () => {
    const result = extractTemplateVariables(
      '{% assign greeting = "hello" %}{% capture output %}{{ greeting }}{% endcapture %}',
    )
    expect(result).toContain('greeting')
    expect(result).not.toContain('assign')
    expect(result).not.toContain('capture')
    expect(result).not.toContain('endcapture')
  })
})

describe('renderTemplate', () => {
  it('renders basic template with variables', async () => {
    const result = await renderTemplate('Hello {{ name }}!', { name: 'World' })
    expect(result).toBe('Hello World!')
  })

  it('throws on missing variable in strict mode', async () => {
    await expect(renderTemplate('Hello {{ missing }}!', {})).rejects.toThrow()
  })

  it('renders nested properties', async () => {
    const result = await renderTemplate('{{ user.name }}', { user: { name: 'Alice' } })
    expect(result).toBe('Alice')
  })
})

describe('validateTemplateWithEntries', () => {
  it('returns empty array for valid entries', async () => {
    const failures = await validateTemplateWithEntries('Hello {{ name }}', [{ name: 'Alice' }, { name: 'Bob' }])
    expect(failures).toEqual([])
  })

  it('returns failures for entries missing variables', async () => {
    const failures = await validateTemplateWithEntries('Hello {{ name }}', [{ name: 'Alice' }, { age: 30 }])
    expect(failures).toHaveLength(1)
    expect(failures[0]?.index).toBe(1)
    expect(failures[0]?.message).toBeDefined()
  })

  it('returns empty array for empty entries', async () => {
    const failures = await validateTemplateWithEntries('Hello {{ name }}', [])
    expect(failures).toEqual([])
  })
})
