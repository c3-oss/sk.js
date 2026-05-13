/** Escapes one cell according to RFC 4180-style CSV quoting rules. */
const escapeCsv = (value: string): string => {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replaceAll('"', '""')}"`
  }

  return value
}

/** Serializes homogeneous string rows to CSV with a header row. */
export const toCsv = (rows: readonly Record<string, string>[]): string => {
  if (rows.length === 0) {
    return ''
  }

  const headers = Object.keys(rows[0] ?? {})
  const lines = [headers.join(',')]

  for (const row of rows) {
    const values = headers.map((header) => escapeCsv(String(row[header] ?? '')))
    lines.push(values.join(','))
  }

  return `${lines.join('\n')}\n`
}
