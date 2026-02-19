import { Liquid } from 'liquidjs'

const engine = new Liquid({
  strictVariables: true,
  strictFilters: false,
  jsTruthy: true,
})

const LIQUID_KEYWORDS = new Set([
  'if',
  'elsif',
  'else',
  'endif',
  'unless',
  'endunless',
  'for',
  'endfor',
  'case',
  'when',
  'endcase',
  'assign',
  'capture',
  'endcapture',
  'increment',
  'decrement',
  'tablerow',
  'endtablerow',
  'cycle',
  'include',
  'render',
  'layout',
  'block',
  'endblock',
  'raw',
  'endraw',
  'comment',
  'endcomment',
  'liquid',
  'echo',
  'break',
  'continue',
  'in',
  'and',
  'or',
  'not',
  'contains',
  'true',
  'false',
  'nil',
  'null',
  'blank',
  'empty',
])

const normalizeVariables = (variables: readonly string[]): readonly string[] =>
  [...new Set(variables)]
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && !LIQUID_KEYWORDS.has(value))
    .sort((a, b) => a.localeCompare(b))

export const extractTemplateVariables = (content: string): readonly string[] => {
  const variables: string[] = []

  const outputTagRegex = /\{\{\s*([a-zA-Z_][\w.]*)/g
  for (const match of content.matchAll(outputTagRegex)) {
    const value = match[1]
    if (value !== undefined) {
      variables.push(value.split('.')[0] ?? value)
    }
  }

  const logicTagRegex = /\{%[^%]*\b([a-zA-Z_][\w.]*)\b[^%]*%\}/g
  for (const match of content.matchAll(logicTagRegex)) {
    const value = match[1]
    if (value !== undefined) {
      variables.push(value.split('.')[0] ?? value)
    }
  }

  return normalizeVariables(variables)
}

export const renderTemplate = async (template: string, scope: Record<string, unknown>): Promise<string> =>
  engine.parseAndRender(template, scope)

export const validateTemplateWithEntries = async (
  template: string,
  entries: readonly Record<string, unknown>[],
): Promise<readonly { index: number; message: string }[]> => {
  const failures: { index: number; message: string }[] = []

  for (const [index, entry] of entries.entries()) {
    try {
      await renderTemplate(template, entry)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push({ index, message })
    }
  }

  return failures
}
