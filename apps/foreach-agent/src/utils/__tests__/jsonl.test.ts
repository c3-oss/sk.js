import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { appendJsonLine, readJsonLines } from '../jsonl.js'

let tempDir: string
let tempFile: string

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jsonl-test-'))
  tempFile = path.join(tempDir, 'test.jsonl')
})

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true })
})

describe('appendJsonLine', () => {
  it('appends a JSON line to file', async () => {
    await appendJsonLine(tempFile, { key: 'value' })
    const content = await fs.readFile(tempFile, 'utf-8')
    expect(content).toBe('{"key":"value"}\n')
  })

  it('appends multiple lines', async () => {
    await appendJsonLine(tempFile, { a: 1 })
    await appendJsonLine(tempFile, { b: 2 })
    const content = await fs.readFile(tempFile, 'utf-8')
    const lines = content.trim().split('\n')
    expect(lines).toHaveLength(2)
  })
})

describe('readJsonLines', () => {
  it('reads valid JSON lines', async () => {
    await fs.writeFile(tempFile, '{"a":1}\n{"b":2}\n', 'utf-8')
    const result = await readJsonLines<{ a?: number; b?: number }>(tempFile)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ a: 1 })
    expect(result[1]).toEqual({ b: 2 })
  })

  it('ignores invalid JSON lines', async () => {
    await fs.writeFile(tempFile, '{"a":1}\nnot json\n{"b":2}\n', 'utf-8')
    const result = await readJsonLines(tempFile)
    expect(result).toHaveLength(2)
  })

  it('returns empty array for missing file', async () => {
    const result = await readJsonLines(path.join(tempDir, 'nonexistent.jsonl'))
    expect(result).toEqual([])
  })

  it('returns empty array for empty file', async () => {
    await fs.writeFile(tempFile, '', 'utf-8')
    const result = await readJsonLines(tempFile)
    expect(result).toEqual([])
  })
})
