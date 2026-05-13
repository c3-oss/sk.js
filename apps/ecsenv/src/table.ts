/**
 * Supported output formats for list commands.
 */
export type ListOutputFormat = 'table' | 'json'

/**
 * Parses and validates the list output format flag.
 */
export const parseListOutputFormat = (rawValue: string | undefined): ListOutputFormat => {
  const value = (rawValue ?? 'table').trim().toLowerCase()
  if (value === 'table' || value === 'json') {
    return value
  }
  throw new Error(`invalid --output-format value "${rawValue}". Use table or json`)
}

/**
 * Converts arbitrary table cell values into printable strings.
 */
export const stringifyCell = (value: unknown): string => {
  if (value === undefined || value === null) {
    return ''
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return JSON.stringify(value)
}

/**
 * Renders row objects as a plain fixed-width table.
 */
export const renderTable = (rows: readonly Record<string, unknown>[]): string => {
  if (rows.length === 0) {
    return 'No results'
  }

  const columns = Object.keys(rows[0] ?? {})
  const widths = columns.map((column) =>
    Math.max(column.length, ...rows.map((row) => stringifyCell(row[column]).length)),
  )

  const renderRow = (row: Record<string, unknown>): string =>
    columns.map((column, index) => stringifyCell(row[column]).padEnd(widths[index] ?? column.length)).join(' | ')

  const header = columns.map((column, index) => column.padEnd(widths[index] ?? column.length)).join(' | ')
  const separator = widths.map((width) => '-'.repeat(width)).join('-+-')
  const data = rows.map(renderRow)

  return [header, separator, ...data].join('\n')
}

/**
 * Prints rows in the requested output format.
 */
export const printRows = (
  rows: readonly Record<string, unknown>[],
  outputFormat: ListOutputFormat,
  jsonPayload: Record<string, unknown>,
): void => {
  if (outputFormat === 'json') {
    console.log(JSON.stringify(jsonPayload, null, 2))
    return
  }

  console.log(renderTable(rows))
}
