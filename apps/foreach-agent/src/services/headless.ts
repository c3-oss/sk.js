import fs from 'node:fs/promises'
import path from 'node:path'

import type { Provider, RunConfig, RunRecord } from '../dtos/types.js'
import { DEFAULT_MODELS, isProvider } from '../providers/defaults.js'
import { parseEntriesFromAbsolutePath, parseEntriesFromText } from './entries-parser.js'
import { executeRun } from './run-executor.js'
import { listTemplates } from './store.js'
import { validateTemplateWithEntries } from './template-engine.js'

export interface HeadlessRunInput {
  readonly template: string
  readonly providers?: readonly string[]
  readonly providerModels?: Partial<Record<Provider, string>>
  readonly entries?: readonly Record<string, unknown>[]
  readonly entriesText?: string
  readonly entriesPath?: string
  readonly concurrency?: number
  readonly retries?: number
  readonly timeoutSeconds?: number | null
  readonly autoApproval?: boolean
  readonly cwd?: string
}

interface ResolvedTemplate {
  readonly id: string
  readonly name: string
  readonly filePath: string
  readonly content: string
}

const isFilePath = async (filePath: string): Promise<boolean> => {
  try {
    const stats = await fs.stat(filePath)
    return stats.isFile()
  } catch {
    return false
  }
}

const resolveTemplateFromReference = async (templateRef: string): Promise<ResolvedTemplate> => {
  const trimmed = templateRef.trim()
  if (trimmed.length === 0) {
    throw new Error('template is required')
  }

  const candidatePaths = path.isAbsolute(trimmed) ? [trimmed] : [path.resolve(trimmed)]
  for (const candidatePath of candidatePaths) {
    if (await isFilePath(candidatePath)) {
      const content = await fs.readFile(candidatePath, 'utf-8')
      const name = path.basename(candidatePath)
      return {
        id: name,
        name,
        filePath: candidatePath,
        content,
      }
    }
  }

  const templates = await listTemplates()
  const template = templates.find((item) => item.id === trimmed || item.name === trimmed)
  if (template !== undefined) {
    return template
  }

  throw new Error(`template not found: ${templateRef}`)
}

const resolveProviders = (rawProviders: readonly string[] | undefined): readonly Provider[] => {
  const candidateProviders = rawProviders === undefined || rawProviders.length === 0 ? ['claude'] : rawProviders
  const providers: Provider[] = []

  for (const value of candidateProviders) {
    if (!isProvider(value)) {
      throw new Error(`invalid provider "${value}". Use: claude, cursor-agent, gemini, codex`)
    }
    if (!providers.includes(value)) {
      providers.push(value)
    }
  }

  return providers
}

const resolveEntries = async (input: HeadlessRunInput): Promise<readonly Record<string, unknown>[]> => {
  if (input.entries !== undefined) {
    return input.entries
  }

  if (input.entriesText !== undefined && input.entriesPath !== undefined) {
    throw new Error('use either entriesText or entriesPath, not both')
  }

  if (input.entriesText !== undefined) {
    return parseEntriesFromText(input.entriesText)
  }

  if (input.entriesPath !== undefined) {
    const absolutePath = path.isAbsolute(input.entriesPath) ? input.entriesPath : path.resolve(input.entriesPath)
    return parseEntriesFromAbsolutePath(absolutePath)
  }

  throw new Error('entries are required (entries, entriesText or entriesPath)')
}

const validatePositiveInt = (value: number | undefined, fallback: number, fieldName: string): number => {
  const resolved = value ?? fallback
  if (!Number.isInteger(resolved) || resolved < 1) {
    throw new Error(`${fieldName} must be a positive integer`)
  }
  return resolved
}

const resolveTimeout = (timeoutSeconds: number | null | undefined): number | null => {
  if (timeoutSeconds === undefined || timeoutSeconds === null) {
    return null
  }

  if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 20) {
    throw new Error('timeoutSeconds must be null (infinite) or an integer >= 20')
  }

  return timeoutSeconds
}

const toRunConfig = async (
  input: HeadlessRunInput,
): Promise<{ readonly config: RunConfig; readonly template: ResolvedTemplate }> => {
  const [template, entries] = await Promise.all([resolveTemplateFromReference(input.template), resolveEntries(input)])

  const providers = resolveProviders(input.providers)
  const providerModels = {
    ...DEFAULT_MODELS,
    ...input.providerModels,
  }

  const validationErrors = await validateTemplateWithEntries(template.content, entries)
  if (validationErrors.length > 0) {
    const first = validationErrors[0]
    if (first !== undefined) {
      throw new Error(`template render failed on entry ${first.index}: ${first.message}`)
    }
  }

  return {
    template,
    config: {
      templateId: template.id,
      templateName: template.name,
      templatePath: template.filePath,
      providers: providers.map((provider) => ({
        provider,
        model: providerModels[provider],
      })),
      entries,
      concurrency: validatePositiveInt(input.concurrency, 10, 'concurrency'),
      retries: validatePositiveInt(input.retries, 3, 'retries'),
      timeoutSeconds: resolveTimeout(input.timeoutSeconds),
      autoApproval: input.autoApproval ?? true,
      cwd: path.resolve(input.cwd ?? process.cwd()),
    },
  }
}

export interface HeadlessRunHandlers {
  readonly onRunUpdate?: (run: RunRecord) => void
  readonly onTaskUpdate?: (task: RunRecord['tasks'][number]) => void
}

export const executeHeadlessRun = async (
  input: HeadlessRunInput,
  handlers: HeadlessRunHandlers = {},
): Promise<RunRecord> => {
  const prepared = await toRunConfig(input)
  return executeRun(prepared.config, prepared.template.content, handlers)
}
