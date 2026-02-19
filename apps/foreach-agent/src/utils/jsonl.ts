import fs from 'node:fs/promises'

export const appendJsonLine = async (filePath: string, payload: unknown): Promise<void> => {
  const line = `${JSON.stringify(payload)}\n`
  await fs.appendFile(filePath, line, 'utf-8')
}

export const readJsonLines = async <T>(filePath: string): Promise<readonly T[]> => {
  const content = await fs.readFile(filePath, 'utf-8').catch(() => '')
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  return lines
    .map((line) => {
      try {
        return JSON.parse(line) as T
      } catch {
        return null
      }
    })
    .filter((value): value is T => value !== null)
}
