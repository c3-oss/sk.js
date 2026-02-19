import fs from 'node:fs/promises'
import path from 'node:path'

import YAML from 'yaml'

const ensureEntries = (value: unknown): readonly Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    const entries = value.filter(
      (item): item is Record<string, unknown> => item !== null && typeof item === 'object' && !Array.isArray(item),
    )

    if (entries.length !== value.length) {
      throw new Error('entries must be an array of objects')
    }

    return entries
  }

  if (value !== null && typeof value === 'object' && 'entries' in value) {
    return ensureEntries((value as { entries: unknown }).entries)
  }

  throw new Error('input must be an array of objects or an object with `entries` array')
}

const parseInput = (raw: string): readonly Record<string, unknown>[] => {
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    throw new Error('entries input is empty')
  }

  try {
    return ensureEntries(JSON.parse(trimmed))
  } catch {
    try {
      return ensureEntries(YAML.parse(trimmed))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`failed to parse entries as JSON/YAML: ${message}`)
    }
  }
}

export const parseEntriesFromText = (raw: string): readonly Record<string, unknown>[] => parseInput(raw)

export const parseEntriesFromAbsolutePath = async (
  absolutePath: string,
): Promise<readonly Record<string, unknown>[]> => {
  if (!path.isAbsolute(absolutePath)) {
    throw new Error('entries path must be absolute')
  }

  const content = await fs.readFile(absolutePath, 'utf-8')
  return parseInput(content)
}
