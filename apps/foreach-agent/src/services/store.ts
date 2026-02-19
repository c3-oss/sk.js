import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import type { RunRecord, RunSummary, TaskRecord, TemplateFile } from '../dtos/types.js'
import { toCsv } from '../utils/csv.js'
import { EXPORTS_DIR, FOREACH_AGENT_HOME, RUNS_DIR, TEMPLATES_DIR, toSafeFileName } from '../utils/path.js'

const getFsErrorCode = (errorValue: unknown): string | undefined => {
  if (errorValue !== null && typeof errorValue === 'object' && 'code' in errorValue) {
    const code = (errorValue as { code?: unknown }).code
    if (typeof code === 'string') {
      return code
    }
  }
  return undefined
}

const assertFileNameOnly = (value: string, label: string): void => {
  if (value.includes('/') || value.includes('\\')) {
    throw new Error(`${label} must be a file name, not a path`)
  }
}

export const ensureStorage = async (): Promise<void> => {
  await fs.mkdir(FOREACH_AGENT_HOME, { recursive: true })
  await fs.mkdir(TEMPLATES_DIR, { recursive: true })
  await fs.mkdir(RUNS_DIR, { recursive: true })
  await fs.mkdir(EXPORTS_DIR, { recursive: true })
}

export const listTemplates = async (): Promise<readonly TemplateFile[]> => {
  await ensureStorage()
  const entries = await fs.readdir(TEMPLATES_DIR, { withFileTypes: true })

  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const filePath = path.join(TEMPLATES_DIR, entry.name)
        const [stats, content] = await Promise.all([fs.stat(filePath), fs.readFile(filePath, 'utf-8')])

        return {
          id: entry.name,
          name: entry.name,
          filePath,
          content,
          updatedAt: stats.mtime.toISOString(),
        } satisfies TemplateFile
      }),
  )

  return files.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export const createTemplate = async (name: string, content: string): Promise<TemplateFile> => {
  await ensureStorage()
  const safeName = toSafeFileName(name)
  const fileName = safeName.endsWith('.liquid') ? safeName : `${safeName}.liquid`
  const filePath = path.join(TEMPLATES_DIR, fileName)

  try {
    await fs.writeFile(filePath, content, { encoding: 'utf-8', flag: 'wx' })
  } catch (errorValue) {
    if (getFsErrorCode(errorValue) === 'EEXIST') {
      throw new Error(`template already exists: ${fileName}`)
    }
    throw errorValue
  }
  const stats = await fs.stat(filePath)

  return {
    id: fileName,
    name: fileName,
    filePath,
    content,
    updatedAt: stats.mtime.toISOString(),
  }
}

export const updateTemplate = async (id: string, content: string): Promise<TemplateFile> => {
  assertFileNameOnly(id, 'template id')
  await ensureStorage()
  const filePath = path.join(TEMPLATES_DIR, id)
  await fs.writeFile(filePath, content, 'utf-8')
  const stats = await fs.stat(filePath)

  return {
    id,
    name: id,
    filePath,
    content,
    updatedAt: stats.mtime.toISOString(),
  }
}

export const deleteTemplate = async (id: string): Promise<void> => {
  assertFileNameOnly(id, 'template id')
  await ensureStorage()
  const filePath = path.join(TEMPLATES_DIR, id)
  await fs.rm(filePath, { force: true })
}

export interface RunPaths {
  readonly runDir: string
  readonly promptsDir: string
  readonly transcriptsDir: string
}

export const createRunPaths = async (runId?: string): Promise<RunPaths & { readonly runId: string }> => {
  await ensureStorage()
  const safeRunId = runId ?? randomUUID()
  const runDir = path.join(RUNS_DIR, safeRunId)
  const promptsDir = path.join(runDir, 'prompts')
  const transcriptsDir = path.join(runDir, 'transcripts')

  await fs.mkdir(promptsDir, { recursive: true })
  await fs.mkdir(transcriptsDir, { recursive: true })

  return { runId: safeRunId, runDir, promptsDir, transcriptsDir }
}

export const saveRunRecord = async (run: RunRecord): Promise<void> => {
  const runDir = path.join(RUNS_DIR, run.id)
  await fs.mkdir(runDir, { recursive: true })
  await fs.writeFile(path.join(runDir, 'run.json'), JSON.stringify(run, null, 2), 'utf-8')
}

export const loadRunRecord = async (runId: string): Promise<RunRecord | null> => {
  const runPath = path.join(RUNS_DIR, runId, 'run.json')
  const content = await fs.readFile(runPath, 'utf-8').catch(() => null)
  if (content === null) {
    return null
  }

  try {
    return JSON.parse(content) as RunRecord
  } catch {
    return null
  }
}

export const listRunRecords = async (): Promise<readonly RunRecord[]> => {
  await ensureStorage()
  const entries = await fs.readdir(RUNS_DIR, { withFileTypes: true })

  const runs = await Promise.all(
    entries.filter((entry) => entry.isDirectory()).map(async (entry) => loadRunRecord(entry.name)),
  )

  return runs.filter((run): run is RunRecord => run !== null).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

const summarizeRun = (run: RunRecord): RunSummary => {
  const successTasks = run.tasks.filter((task) => task.status === 'success').length
  const failedTasks = run.tasks.filter((task) => task.status === 'failed' || task.status === 'timeout').length

  return {
    id: run.id,
    createdAt: run.createdAt,
    status: run.status,
    templateName: run.config.templateName,
    providers: [...new Set(run.config.providers.map((config) => config.provider))],
    totalTasks: run.tasks.length,
    successTasks,
    failedTasks,
  }
}

export const listRuns = async (): Promise<readonly RunSummary[]> => {
  const runs = await listRunRecords()
  return runs.map(summarizeRun)
}

export const savePromptFile = async (runId: string, taskId: string, prompt: string): Promise<string> => {
  const filePath = path.join(RUNS_DIR, runId, 'prompts', `${taskId}.md`)
  await fs.writeFile(filePath, prompt, 'utf-8')
  return filePath
}

export const buildTranscriptPath = (runId: string, taskId: string): string =>
  path.join(RUNS_DIR, runId, 'transcripts', `${taskId}.jsonl`)

const toTaskExportRow = (task: TaskRecord): Record<string, string> => ({
  taskId: task.id,
  entryIndex: String(task.entryIndex),
  provider: task.provider,
  model: task.model,
  status: task.status,
  attempt: String(task.attempt),
  maxAttempts: String(task.maxAttempts),
  startedAt: task.startedAt ?? '',
  finishedAt: task.finishedAt ?? '',
  durationMs: task.durationMs === undefined ? '' : String(task.durationMs),
  cwd: task.cwd,
  promptFilePath: task.promptFilePath,
  transcriptFilePath: task.transcriptFilePath,
  outputText: task.outputText ?? '',
  errorMessage: task.errorMessage ?? '',
})

export const exportRun = async (run: RunRecord, format: 'json' | 'csv', outputPath: string): Promise<void> => {
  if (format === 'json') {
    await fs.writeFile(outputPath, JSON.stringify(run, null, 2), 'utf-8')
    return
  }

  const rows = run.tasks.map(toTaskExportRow)
  const csv = toCsv(rows)
  await fs.writeFile(outputPath, csv, 'utf-8')
}
