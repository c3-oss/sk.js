import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RunRecord } from '../../dtos/types.js'

let tempDir: string

vi.mock('../../utils/path.js', async () => {
  const original = await vi.importActual<typeof import('../../utils/path.js')>('../../utils/path.js')
  return {
    ...original,
    get FOREACH_AGENT_HOME() {
      return tempDir
    },
    get TEMPLATES_DIR() {
      return path.join(tempDir, 'templates')
    },
    get RUNS_DIR() {
      return path.join(tempDir, 'runs')
    },
    get EXPORTS_DIR() {
      return path.join(tempDir, 'exports')
    },
  }
})

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'foreach-agent-test-'))
})

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true })
})

describe('store', () => {
  it('ensureStorage creates directories', async () => {
    const { ensureStorage } = await import('../store.js')
    await ensureStorage()

    const templatesStat = await fs.stat(path.join(tempDir, 'templates'))
    expect(templatesStat.isDirectory()).toBe(true)

    const runsStat = await fs.stat(path.join(tempDir, 'runs'))
    expect(runsStat.isDirectory()).toBe(true)

    const exportsStat = await fs.stat(path.join(tempDir, 'exports'))
    expect(exportsStat.isDirectory()).toBe(true)
  })

  it('createTemplate and listTemplates round-trip', async () => {
    const { createTemplate, listTemplates, ensureStorage } = await import('../store.js')
    await ensureStorage()

    const template = await createTemplate('test-template', 'Hello {{ name }}')
    expect(template.name).toBe('test-template.liquid')
    expect(template.content).toBe('Hello {{ name }}')

    const list = await listTemplates()
    expect(list).toHaveLength(1)
    expect(list[0]?.name).toBe('test-template.liquid')
  })

  it('createTemplate fails when template already exists', async () => {
    const { createTemplate, ensureStorage } = await import('../store.js')
    await ensureStorage()

    await createTemplate('duplicate', 'one')
    await expect(createTemplate('duplicate', 'two')).rejects.toThrow(/already exists/i)
  })

  it('updateTemplate modifies content', async () => {
    const { createTemplate, updateTemplate, listTemplates, ensureStorage } = await import('../store.js')
    await ensureStorage()

    await createTemplate('my-tpl', 'original content')
    const updated = await updateTemplate('my-tpl.liquid', 'new content')
    expect(updated.content).toBe('new content')

    const list = await listTemplates()
    expect(list[0]?.content).toBe('new content')
  })

  it('deleteTemplate removes the file', async () => {
    const { createTemplate, deleteTemplate, listTemplates, ensureStorage } = await import('../store.js')
    await ensureStorage()

    await createTemplate('to-delete', 'content')
    let list = await listTemplates()
    expect(list).toHaveLength(1)

    await deleteTemplate('to-delete.liquid')
    list = await listTemplates()
    expect(list).toHaveLength(0)
  })

  it('saveRunRecord and loadRunRecord round-trip', async () => {
    const { saveRunRecord, loadRunRecord, ensureStorage } = await import('../store.js')
    await ensureStorage()

    const run: RunRecord = {
      id: 'test-run-123',
      createdAt: new Date().toISOString(),
      status: 'completed',
      config: {
        templateId: 'tpl-1',
        templateName: 'test',
        templatePath: '/tmp/test',
        providers: [{ provider: 'claude', model: 'claude-opus-4-6' }],
        entries: [{ name: 'world' }],
        concurrency: 1,
        retries: 1,
        timeoutSeconds: null,
        autoApproval: true,
        cwd: '/tmp',
      },
      tasks: [],
    }

    await saveRunRecord(run)
    const loaded = await loadRunRecord('test-run-123')
    expect(loaded).not.toBeNull()
    expect(loaded?.id).toBe('test-run-123')
    expect(loaded?.status).toBe('completed')
  })

  it('loadRunRecord returns null for missing run', async () => {
    const { loadRunRecord, ensureStorage } = await import('../store.js')
    await ensureStorage()

    const result = await loadRunRecord('nonexistent')
    expect(result).toBeNull()
  })

  it('listRuns returns summaries', async () => {
    const { saveRunRecord, listRuns, ensureStorage } = await import('../store.js')
    await ensureStorage()

    const run: RunRecord = {
      id: 'run-summary-test',
      createdAt: new Date().toISOString(),
      status: 'completed',
      config: {
        templateId: 'tpl-1',
        templateName: 'summary-test',
        templatePath: '/tmp/test',
        providers: [{ provider: 'claude', model: 'claude-opus-4-6' }],
        entries: [{ name: 'world' }],
        concurrency: 1,
        retries: 1,
        timeoutSeconds: null,
        autoApproval: true,
        cwd: '/tmp',
      },
      tasks: [
        {
          id: 'task-1',
          runId: 'run-summary-test',
          entryIndex: 0,
          provider: 'claude',
          model: 'claude-opus-4-6',
          cwd: '/tmp',
          promptFilePath: '',
          transcriptFilePath: '',
          status: 'success',
          attempt: 1,
          maxAttempts: 1,
          prettyLogs: [],
        },
      ],
    }

    await saveRunRecord(run)
    const list = await listRuns()
    expect(list).toHaveLength(1)
    expect(list[0]?.templateName).toBe('summary-test')
    expect(list[0]?.successTasks).toBe(1)
  })

  it('exportRun writes JSON file', async () => {
    const { exportRun, ensureStorage } = await import('../store.js')
    await ensureStorage()

    const run: RunRecord = {
      id: 'export-test',
      createdAt: new Date().toISOString(),
      status: 'completed',
      config: {
        templateId: 'tpl-1',
        templateName: 'export-test',
        templatePath: '/tmp/test',
        providers: [],
        entries: [],
        concurrency: 1,
        retries: 1,
        timeoutSeconds: null,
        autoApproval: true,
        cwd: '/tmp',
      },
      tasks: [],
    }

    const outputPath = path.join(tempDir, 'export.json')
    await exportRun(run, 'json', outputPath)

    const content = await fs.readFile(outputPath, 'utf-8')
    const parsed = JSON.parse(content)
    expect(parsed.id).toBe('export-test')
  })

  it('exportRun writes CSV file', async () => {
    const { exportRun, ensureStorage } = await import('../store.js')
    await ensureStorage()

    const run: RunRecord = {
      id: 'csv-export-test',
      createdAt: new Date().toISOString(),
      status: 'completed',
      config: {
        templateId: 'tpl-1',
        templateName: 'csv-test',
        templatePath: '/tmp/test',
        providers: [],
        entries: [],
        concurrency: 1,
        retries: 1,
        timeoutSeconds: null,
        autoApproval: true,
        cwd: '/tmp',
      },
      tasks: [
        {
          id: 'task-csv',
          runId: 'csv-export-test',
          entryIndex: 0,
          provider: 'claude',
          model: 'claude-opus-4-6',
          cwd: '/tmp',
          promptFilePath: '',
          transcriptFilePath: '',
          status: 'success',
          attempt: 1,
          maxAttempts: 1,
          prettyLogs: [],
        },
      ],
    }

    const outputPath = path.join(tempDir, 'export.csv')
    await exportRun(run, 'csv', outputPath)

    const content = await fs.readFile(outputPath, 'utf-8')
    expect(content).toContain('taskId')
    expect(content).toContain('task-csv')
  })
})
