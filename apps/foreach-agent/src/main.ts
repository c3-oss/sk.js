import fs from 'node:fs/promises'
import path from 'node:path'

import { render } from 'ink'
import React from 'react'

import type { RunRecord, TaskRecord, TemplateFile } from './dtos/types.js'
import { executeHeadlessRun } from './services/headless.js'
import { filterWithQuery } from './services/query-filter.js'
import {
  createTemplate,
  deleteTemplate,
  exportRun,
  listRunRecords,
  listTemplates,
  loadRunRecord,
  updateTemplate,
} from './services/store.js'
import { extractTemplateVariables } from './services/template-engine.js'
import App from './tui/App.js'
import type { AppScreen } from './tui/App.js'
import { toCsv } from './utils/csv.js'

/** Supported CLI output modes. */
export type OutputFormat = 'interactive' | 'table' | 'json' | 'csv'
type NonInteractiveOutputFormat = Exclude<OutputFormat, 'interactive'>

/** Parsed command-line arguments split into positionals and repeated flags. */
interface ParsedArgv {
  /** Positional tokens after option parsing. */
  readonly positionals: readonly string[]
  /** Flag values keyed by flag name, preserving repeated values. */
  readonly flags: ReadonlyMap<string, readonly string[]>
}

const HELP_TEXT = `foreach-agent

Usage:
  foreach-agent                                            Open TUI
  foreach-agent tui                                        Open TUI
  foreach-agent run --template ...                         Execute run without TUI
  foreach-agent templates [list]                           List templates
  foreach-agent templates create --name ...                Create template
  foreach-agent templates read --id ...                    Read template
  foreach-agent templates update --id ...                  Update template
  foreach-agent templates delete --id ...                  Delete template
  foreach-agent runs                                       List runs
  foreach-agent tasks --run-id ...                         List tasks from a run
  foreach-agent configs                                    List run configs
  foreach-agent export --run-id ... --format ... --output  Export run to a file

Common flags:
  --query '<expr>'                    Filtrex filter
  --output-format interactive|table|json|csv
  --query requires table|json|csv

Run (without TUI):
  --template <id|path>
  --entries '<json|yaml>'
  --entries-path <path>
  --entries-stdin
  --providers 'claude,codex'
  --provider <name>
  --claude-model <model>
  --cursor-model <model>
  --gemini-model <model>
  --codex-model <model>
  --concurrency <n>
  --retries <n>
  --timeout-seconds <n|infinite>
  --cwd <path>
  --auto-approval <true|false>
  --no-auto-approval

Template CRUD flags:
  --name <name>                      Name for create
  --id <id>                          ID for read/update/delete
  --content '<text>'                 Inline content for create/update
  --content-path <path>              Content from file
  --content-stdin                    Content from stdin

Query fields:
  templates: id, name, filePath, updatedAt, updatedAtEpoch, content, contentLength, variablesCount
  runs: id, status, templateName, templateId, providers, providerCount, entryCount, taskCount, successTasks,
        failedTasks, concurrency, retries, timeoutSeconds, autoApproval, cwd, createdAt, startedAt, finishedAt
  tasks: id, runId, status, provider, model, entryIndex, attempt, maxAttempts, durationMs, hasError,
         hasOutput, errorMessage, outputText, templateName, concurrency, retries, autoApproval, cwd
  configs: runId, runStatus, templateName, templateId, providerCount, providers, entryCount, concurrency,
           retries, timeoutSeconds, autoApproval, cwd, createdAt`

/** Parses long flags, short help, repeated options, and positional arguments. */
export const parseArgv = (argv: readonly string[]): ParsedArgv => {
  const positionals: string[] = []
  const flags = new Map<string, string[]>()

  const pushFlag = (name: string, value: string): void => {
    const existing = flags.get(name) ?? []
    existing.push(value)
    flags.set(name, existing)
  }

  const isValueToken = (value: string | undefined): value is string => {
    if (value === undefined || value === '--') {
      return false
    }

    if (value.startsWith('--')) {
      return false
    }

    if (value.startsWith('-') && !/^-\d+(\.\d+)?$/.test(value)) {
      return false
    }

    return true
  }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === undefined) {
      continue
    }

    if (token === '--') {
      positionals.push(...argv.slice(index + 1))
      break
    }

    if (token === '-h') {
      pushFlag('help', 'true')
      continue
    }

    if (!token.startsWith('--')) {
      positionals.push(token)
      continue
    }

    const flagToken = token.slice(2)
    const equalsIndex = flagToken.indexOf('=')
    if (equalsIndex >= 0) {
      const name = flagToken.slice(0, equalsIndex)
      const value = flagToken.slice(equalsIndex + 1)
      pushFlag(name, value)
      continue
    }

    const nextToken = argv[index + 1]
    if (isValueToken(nextToken)) {
      pushFlag(flagToken, nextToken)
      index += 1
      continue
    }

    pushFlag(flagToken, 'true')
  }

  return { positionals, flags }
}

/** Checks whether a parsed flag was supplied at least once. */
const hasFlag = (parsed: ParsedArgv, name: string): boolean => parsed.flags.has(name)

/** Returns every value supplied for a parsed flag. */
const getFlagValues = (parsed: ParsedArgv, name: string): readonly string[] => parsed.flags.get(name) ?? []

/** Returns the last value supplied for a parsed flag. */
const getLastFlagValue = (parsed: ParsedArgv, name: string): string | undefined => getFlagValues(parsed, name).at(-1)

/** Parses CLI boolean values from common textual forms. */
const parseBoolean = (value: string, fieldName: string): boolean => {
  const normalized = value.trim().toLowerCase()
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true
  }
  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false
  }
  throw new Error(`invalid ${fieldName} "${value}". Use true or false`)
}

/** Parses an integer CLI option with a field-specific error message. */
const parseIntField = (value: string, fieldName: string): number => {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed)) {
    throw new Error(`invalid ${fieldName} "${value}". Use an integer`)
  }
  return parsed
}

/** Options that control output format parsing. */
interface OutputFormatOptions {
  /** Format used when the flag is omitted. */
  readonly defaultValue?: OutputFormat
  /** Whether interactive output is valid for this command. */
  readonly allowInteractive?: boolean
}

/** Parses and validates the output format requested by a CLI command. */
export const parseOutputFormat = (rawValue: string | undefined, options: OutputFormatOptions = {}): OutputFormat => {
  const defaultValue = options.defaultValue ?? 'interactive'
  const allowInteractive = options.allowInteractive ?? true
  const normalized = (rawValue ?? defaultValue).trim().toLowerCase()

  if (normalized === 'table' || normalized === 'json' || normalized === 'csv') {
    return normalized
  }

  if (normalized === 'interactive') {
    if (!allowInteractive) {
      throw new Error('interactive output is not supported for this command')
    }
    return 'interactive'
  }

  throw new Error(`invalid --output-format value "${rawValue}". Use: interactive, table, json, csv`)
}

/** Converts values to terminal/table-safe cell strings. */
const stringifyCell = (value: unknown): string => {
  if (value === null || value === undefined) {
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

/** Converts arbitrary row values into strings for CSV output. */
const toStringRows = (rows: readonly Record<string, unknown>[]): readonly Record<string, string>[] =>
  rows.map(
    (row) =>
      Object.fromEntries(Object.entries(row).map(([key, value]) => [key, stringifyCell(value)])) as Record<
        string,
        string
      >,
  )

/** Renders rows as a fixed-width terminal table. */
const renderTable = (rows: readonly Record<string, unknown>[]): string => {
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

/** Prints rows in table, JSON, or CSV format. */
const printRows = (
  rows: readonly Record<string, unknown>[],
  format: NonInteractiveOutputFormat,
  jsonPayload: Record<string, unknown>,
): void => {
  if (format === 'json') {
    console.log(JSON.stringify(jsonPayload, null, 2))
    return
  }

  if (format === 'csv') {
    console.log(toCsv(toStringRows(rows)))
    return
  }

  console.log(renderTable(rows))
}

/** Maps task records to the default CLI task table shape. */
const getTaskRows = (tasks: readonly TaskRecord[]): readonly Record<string, unknown>[] =>
  tasks.map((task) => ({
    id: task.id,
    status: task.status,
    provider: task.provider,
    model: task.model,
    entryIndex: task.entryIndex,
    attempt: task.attempt,
    maxAttempts: task.maxAttempts,
    durationMs: task.durationMs ?? '',
    hasError: task.errorMessage !== undefined,
    errorMessage: task.errorMessage ?? '',
  }))

/** Computes reusable task counts and unique providers for a run. */
const getRunMetrics = (run: RunRecord) => {
  const providers = [...new Set(run.config.providers.map((providerConfig) => providerConfig.provider))]
  const successTasks = run.tasks.filter((task) => task.status === 'success').length
  const failedTasks = run.tasks.filter((task) => task.status === 'failed' || task.status === 'timeout').length
  const runningTasks = run.tasks.filter((task) => task.status === 'running').length
  const pendingTasks = run.tasks.filter((task) => task.status === 'pending').length

  return {
    providers,
    successTasks,
    failedTasks,
    runningTasks,
    pendingTasks,
  }
}

/** Maps a run record to the default CLI runs table shape. */
const toRunRow = (run: RunRecord): Record<string, unknown> => {
  const metrics = getRunMetrics(run)
  return {
    id: run.id,
    status: run.status,
    templateName: run.config.templateName,
    providers: metrics.providers.join(','),
    taskCount: run.tasks.length,
    successTasks: metrics.successTasks,
    failedTasks: metrics.failedTasks,
    concurrency: run.config.concurrency,
    retries: run.config.retries,
    timeoutSeconds: run.config.timeoutSeconds ?? 'infinite',
    autoApproval: run.config.autoApproval,
    createdAt: run.createdAt,
  }
}

/** Builds the query context exposed to run-list Filtrex expressions. */
const toRunQueryContext = (run: RunRecord): Record<string, unknown> => {
  const metrics = getRunMetrics(run)
  return {
    id: run.id,
    status: run.status,
    templateId: run.config.templateId,
    templateName: run.config.templateName,
    templatePath: run.config.templatePath,
    providers: metrics.providers.join(','),
    providerCount: metrics.providers.length,
    entryCount: run.config.entries.length,
    taskCount: run.tasks.length,
    successTasks: metrics.successTasks,
    failedTasks: metrics.failedTasks,
    runningTasks: metrics.runningTasks,
    pendingTasks: metrics.pendingTasks,
    concurrency: run.config.concurrency,
    retries: run.config.retries,
    timeoutSeconds: run.config.timeoutSeconds ?? -1,
    autoApproval: run.config.autoApproval,
    cwd: run.config.cwd,
    createdAt: run.createdAt,
    startedAt: run.startedAt ?? '',
    finishedAt: run.finishedAt ?? '',
  }
}

/** Builds the query context exposed to task-list Filtrex expressions. */
const toTaskQueryContext = (run: RunRecord, task: TaskRecord): Record<string, unknown> => ({
  id: task.id,
  runId: run.id,
  status: task.status,
  provider: task.provider,
  model: task.model,
  entryIndex: task.entryIndex,
  attempt: task.attempt,
  maxAttempts: task.maxAttempts,
  durationMs: task.durationMs ?? 0,
  hasError: task.errorMessage !== undefined,
  hasOutput: (task.outputText ?? '').trim().length > 0,
  errorMessage: task.errorMessage ?? '',
  outputText: task.outputText ?? '',
  templateName: run.config.templateName,
  concurrency: run.config.concurrency,
  retries: run.config.retries,
  autoApproval: run.config.autoApproval,
  cwd: run.config.cwd,
})

/** Builds the query context exposed to template-list Filtrex expressions. */
const toTemplateQueryContext = (template: TemplateFile): Record<string, unknown> => ({
  id: template.id,
  name: template.name,
  filePath: template.filePath,
  updatedAt: template.updatedAt,
  updatedAtEpoch: Number.isNaN(Date.parse(template.updatedAt)) ? 0 : Date.parse(template.updatedAt),
  content: template.content,
  contentLength: template.content.length,
  variablesCount: extractTemplateVariables(template.content).length,
})

/** Maps a template to the default CLI template table shape. */
const toTemplateRow = (template: TemplateFile): Record<string, unknown> => ({
  id: template.id,
  updatedAt: template.updatedAt,
  variablesCount: extractTemplateVariables(template.content).length,
  contentLength: template.content.length,
})

/** Builds the query context exposed to config-list Filtrex expressions. */
const toConfigQueryContext = (run: RunRecord): Record<string, unknown> => {
  const providers = [...new Set(run.config.providers.map((providerConfig) => providerConfig.provider))]
  return {
    runId: run.id,
    runStatus: run.status,
    templateId: run.config.templateId,
    templateName: run.config.templateName,
    providerCount: providers.length,
    providers: providers.join(','),
    entryCount: run.config.entries.length,
    concurrency: run.config.concurrency,
    retries: run.config.retries,
    timeoutSeconds: run.config.timeoutSeconds ?? -1,
    autoApproval: run.config.autoApproval,
    cwd: run.config.cwd,
    createdAt: run.createdAt,
  }
}

/** Maps a run config to the default CLI configs table shape. */
const toConfigRow = (run: RunRecord): Record<string, unknown> => {
  const context = toConfigQueryContext(run)
  return {
    runId: context.runId,
    runStatus: context.runStatus,
    templateName: context.templateName,
    providers: context.providers,
    entryCount: context.entryCount,
    concurrency: context.concurrency,
    retries: context.retries,
    timeoutSeconds: context.timeoutSeconds === -1 ? 'infinite' : context.timeoutSeconds,
    autoApproval: context.autoApproval,
    cwd: context.cwd,
  }
}

/** Reads all available stdin text. */
const readStdin = async (): Promise<string> =>
  new Promise((resolve, reject) => {
    let buffer = ''
    process.stdin.setEncoding('utf-8')
    process.stdin.on('data', (chunk: string) => {
      buffer += chunk
    })
    process.stdin.on('error', (errorValue) => {
      reject(errorValue)
    })
    process.stdin.on('end', () => {
      resolve(buffer)
    })
  })

/** Resolves text input from inline, path, or stdin flags. */
const readTextInput = async (
  parsed: ParsedArgv,
  options: {
    readonly inlineFlag: string
    readonly pathFlag: string
    readonly stdinFlag: string
    readonly label: string
    readonly required?: boolean
  },
): Promise<string | undefined> => {
  const inlineValue = getLastFlagValue(parsed, options.inlineFlag)
  const pathValue = getLastFlagValue(parsed, options.pathFlag)
  const stdinRequested = hasFlag(parsed, options.stdinFlag)

  if (inlineValue !== undefined && pathValue !== undefined) {
    throw new Error(`use either --${options.inlineFlag} or --${options.pathFlag}, not both`)
  }

  if (inlineValue !== undefined) {
    return inlineValue
  }

  if (pathValue !== undefined) {
    const absolutePath = path.resolve(pathValue)
    return fs.readFile(absolutePath, 'utf-8')
  }

  if (stdinRequested || !process.stdin.isTTY) {
    const content = await readStdin()
    if (content.trim().length > 0) {
      return content
    }
  }

  if (options.required ?? false) {
    throw new Error(
      `${options.label} is required. Use --${options.inlineFlag}, --${options.pathFlag} or --${options.stdinFlag}`,
    )
  }

  return undefined
}

/** Ensures query filtering is only used with non-interactive output. */
const assertQueryAllowed = (query: string, format: OutputFormat): void => {
  if (format === 'interactive' && query.trim().length > 0) {
    throw new Error('query requires non-interactive output-format (table, json or csv)')
  }
}

/** Executes a non-interactive run command and prints its task results. */
const runHeadlessCommand = async (parsed: ParsedArgv): Promise<void> => {
  const format = parseOutputFormat(getLastFlagValue(parsed, 'output-format'), {
    defaultValue: 'table',
    allowInteractive: false,
  })
  const outputFormat = format as NonInteractiveOutputFormat
  const commandPositionals = parsed.positionals.slice(1)
  const templateRef = getLastFlagValue(parsed, 'template') ?? commandPositionals[0]
  if (templateRef === undefined || templateRef.trim().length === 0) {
    throw new Error('missing template. Use --template <id|path>')
  }

  const providerCsv = getLastFlagValue(parsed, 'providers')
  const providersFromCsv =
    providerCsv === undefined
      ? []
      : providerCsv
          .split(',')
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
  const providers = [...providersFromCsv, ...getFlagValues(parsed, 'provider')]

  const timeoutRaw = getLastFlagValue(parsed, 'timeout-seconds')
  const timeoutSeconds =
    timeoutRaw === undefined
      ? undefined
      : ['infinite', 'none', 'null', ''].includes(timeoutRaw.trim().toLowerCase())
        ? null
        : parseIntField(timeoutRaw, 'timeout-seconds')

  const autoApprovalRaw = getLastFlagValue(parsed, 'auto-approval')
  const autoApproval = hasFlag(parsed, 'no-auto-approval')
    ? false
    : autoApprovalRaw === undefined
      ? undefined
      : parseBoolean(autoApprovalRaw, 'auto-approval')

  const query = getLastFlagValue(parsed, 'query') ?? ''
  const entriesPath = getLastFlagValue(parsed, 'entries-path')

  let entriesText = getLastFlagValue(parsed, 'entries')
  const shouldReadStdin =
    hasFlag(parsed, 'entries-stdin') || (entriesText === undefined && entriesPath === undefined && !process.stdin.isTTY)

  if (shouldReadStdin) {
    const stdinContent = await readStdin()
    if (stdinContent.trim().length > 0) {
      entriesText = stdinContent
    }
  }

  const run = await executeHeadlessRun({
    template: templateRef,
    providers: providers.length > 0 ? providers : undefined,
    providerModels: {
      claude: getLastFlagValue(parsed, 'claude-model'),
      'cursor-agent': getLastFlagValue(parsed, 'cursor-model'),
      gemini: getLastFlagValue(parsed, 'gemini-model'),
      codex: getLastFlagValue(parsed, 'codex-model'),
    },
    entriesText,
    entriesPath,
    concurrency: getLastFlagValue(parsed, 'concurrency')
      ? parseIntField(getLastFlagValue(parsed, 'concurrency') as string, 'concurrency')
      : undefined,
    retries: getLastFlagValue(parsed, 'retries')
      ? parseIntField(getLastFlagValue(parsed, 'retries') as string, 'retries')
      : undefined,
    timeoutSeconds,
    autoApproval,
    cwd: getLastFlagValue(parsed, 'cwd'),
  })

  const filteredTasks = filterWithQuery(
    run.tasks,
    query,
    (task) => toTaskQueryContext(run, task),
    (task) => task.id,
  )
  const taskRows = getTaskRows(filteredTasks)

  printRows(taskRows, outputFormat, {
    run,
    matchedTasks: filteredTasks.length,
    totalTasks: run.tasks.length,
    query: query.trim().length === 0 ? null : query,
    tasks: filteredTasks,
  })
}

/** Starts the Ink TUI and waits for it to exit. */
const runTui = async (
  options: { readonly initialScreen?: AppScreen; readonly initialRunId?: string } = {},
): Promise<void> => {
  const { waitUntilExit } = render(React.createElement(App, options))
  await waitUntilExit()
}

/** Lists templates or opens the templates screen. */
const runTemplatesListCommand = async (parsed: ParsedArgv): Promise<void> => {
  const format = parseOutputFormat(getLastFlagValue(parsed, 'output-format'), { defaultValue: 'interactive' })
  const query = getLastFlagValue(parsed, 'query') ?? ''
  assertQueryAllowed(query, format)

  if (format === 'interactive') {
    await runTui({ initialScreen: 'templates' })
    return
  }

  const templates = await listTemplates()
  const filteredTemplates = filterWithQuery(templates, query, toTemplateQueryContext, (template) => template.id)
  const rows = filteredTemplates.map(toTemplateRow)

  printRows(rows, format, {
    totalTemplates: templates.length,
    matchedTemplates: filteredTemplates.length,
    query: query.trim().length === 0 ? null : query,
    templates: filteredTemplates,
  })
}

/** Reads one template and prints its metadata and content. */
const runTemplatesReadCommand = async (parsed: ParsedArgv): Promise<void> => {
  const format = parseOutputFormat(getLastFlagValue(parsed, 'output-format'), {
    defaultValue: 'table',
    allowInteractive: false,
  }) as NonInteractiveOutputFormat
  const id = getLastFlagValue(parsed, 'id') ?? parsed.positionals[2]
  if (id === undefined || id.trim().length === 0) {
    throw new Error('missing template id. Use --id <templateId>')
  }

  const templates = await listTemplates()
  const template = templates.find((item) => item.id === id || item.name === id)
  if (template === undefined) {
    throw new Error(`template not found: ${id}`)
  }

  const row = {
    id: template.id,
    name: template.name,
    filePath: template.filePath,
    updatedAt: template.updatedAt,
    variablesCount: extractTemplateVariables(template.content).length,
    content: template.content,
  }

  printRows([row], format, { template })
}

/** Creates a template from inline, file, or stdin content. */
const runTemplatesCreateCommand = async (parsed: ParsedArgv): Promise<void> => {
  const format = parseOutputFormat(getLastFlagValue(parsed, 'output-format'), {
    defaultValue: 'table',
    allowInteractive: false,
  }) as NonInteractiveOutputFormat
  const name = getLastFlagValue(parsed, 'name') ?? parsed.positionals[2]
  if (name === undefined || name.trim().length === 0) {
    throw new Error('missing template name. Use --name <templateName>')
  }

  const content = await readTextInput(parsed, {
    inlineFlag: 'content',
    pathFlag: 'content-path',
    stdinFlag: 'content-stdin',
    label: 'template content',
    required: true,
  })

  const created = await createTemplate(name, content as string)
  const row = {
    id: created.id,
    updatedAt: created.updatedAt,
    variablesCount: extractTemplateVariables(created.content).length,
    contentLength: created.content.length,
  }
  printRows([row], format, { template: created, action: 'created' })
}

/** Updates a template from inline, file, or stdin content. */
const runTemplatesUpdateCommand = async (parsed: ParsedArgv): Promise<void> => {
  const format = parseOutputFormat(getLastFlagValue(parsed, 'output-format'), {
    defaultValue: 'table',
    allowInteractive: false,
  }) as NonInteractiveOutputFormat
  const id = getLastFlagValue(parsed, 'id') ?? parsed.positionals[2]
  if (id === undefined || id.trim().length === 0) {
    throw new Error('missing template id. Use --id <templateId>')
  }

  const content = await readTextInput(parsed, {
    inlineFlag: 'content',
    pathFlag: 'content-path',
    stdinFlag: 'content-stdin',
    label: 'template content',
    required: true,
  })

  const updated = await updateTemplate(id, content as string)
  const row = {
    id: updated.id,
    updatedAt: updated.updatedAt,
    variablesCount: extractTemplateVariables(updated.content).length,
    contentLength: updated.content.length,
  }
  printRows([row], format, { template: updated, action: 'updated' })
}

/** Deletes a stored template by id. */
const runTemplatesDeleteCommand = async (parsed: ParsedArgv): Promise<void> => {
  const format = parseOutputFormat(getLastFlagValue(parsed, 'output-format'), {
    defaultValue: 'table',
    allowInteractive: false,
  }) as NonInteractiveOutputFormat
  const id = getLastFlagValue(parsed, 'id') ?? parsed.positionals[2]
  if (id === undefined || id.trim().length === 0) {
    throw new Error('missing template id. Use --id <templateId>')
  }

  await deleteTemplate(id)
  const row = { id, deleted: true }
  printRows([row], format, { id, action: 'deleted' })
}

/** Dispatches template subcommands. */
const runTemplatesCommand = async (parsed: ParsedArgv): Promise<void> => {
  const subcommand = parsed.positionals[1] ?? 'list'

  if (subcommand === 'list') {
    await runTemplatesListCommand(parsed)
    return
  }
  if (subcommand === 'create') {
    await runTemplatesCreateCommand(parsed)
    return
  }
  if (subcommand === 'read') {
    await runTemplatesReadCommand(parsed)
    return
  }
  if (subcommand === 'update') {
    await runTemplatesUpdateCommand(parsed)
    return
  }
  if (subcommand === 'delete') {
    await runTemplatesDeleteCommand(parsed)
    return
  }

  throw new Error(`unknown templates subcommand "${subcommand}". Use: list, create, read, update, delete`)
}

/** Lists run history or opens the run-history screen. */
const runRunsCommand = async (parsed: ParsedArgv): Promise<void> => {
  const format = parseOutputFormat(getLastFlagValue(parsed, 'output-format'), { defaultValue: 'interactive' })
  const query = getLastFlagValue(parsed, 'query') ?? ''
  assertQueryAllowed(query, format)

  if (format === 'interactive') {
    await runTui({ initialScreen: 'runs' })
    return
  }

  const runs = await listRunRecords()
  const filteredRuns = filterWithQuery(runs, query, toRunQueryContext, (run) => run.id)
  const rows = filteredRuns.map(toRunRow)

  printRows(rows, format, {
    totalRuns: runs.length,
    matchedRuns: filteredRuns.length,
    query: query.trim().length === 0 ? null : query,
    runs: filteredRuns,
  })
}

/** Lists tasks for a run or opens the monitor screen. */
const runTasksCommand = async (parsed: ParsedArgv): Promise<void> => {
  const format = parseOutputFormat(getLastFlagValue(parsed, 'output-format'), { defaultValue: 'interactive' })
  const query = getLastFlagValue(parsed, 'query') ?? ''
  assertQueryAllowed(query, format)

  const commandPositionals = parsed.positionals.slice(1)
  const runId = getLastFlagValue(parsed, 'run-id') ?? commandPositionals[0]
  if (runId === undefined || runId.trim().length === 0) {
    throw new Error('missing run id. Use --run-id <runId>')
  }

  if (format === 'interactive') {
    await runTui({ initialScreen: 'monitor', initialRunId: runId })
    return
  }

  const run = await loadRunRecord(runId)
  if (run === null) {
    throw new Error(`run not found: ${runId}`)
  }

  const filteredTasks = filterWithQuery(
    run.tasks,
    query,
    (task) => toTaskQueryContext(run, task),
    (task) => task.id,
  )
  const rows = getTaskRows(filteredTasks)

  printRows(rows, format, {
    runId: run.id,
    templateName: run.config.templateName,
    totalTasks: run.tasks.length,
    matchedTasks: filteredTasks.length,
    query: query.trim().length === 0 ? null : query,
    tasks: filteredTasks,
  })
}

/** Lists persisted run configs for inspection and filtering. */
const runConfigsCommand = async (parsed: ParsedArgv): Promise<void> => {
  const format = parseOutputFormat(getLastFlagValue(parsed, 'output-format'), { defaultValue: 'interactive' })
  const query = getLastFlagValue(parsed, 'query') ?? ''
  assertQueryAllowed(query, format)

  if (format === 'interactive') {
    await runTui({ initialScreen: 'runs' })
    return
  }

  const runId = getLastFlagValue(parsed, 'run-id')

  const runs = await listRunRecords()
  const scopedRuns = runId === undefined ? runs : runs.filter((run) => run.id === runId)
  if (runId !== undefined && scopedRuns.length === 0) {
    throw new Error(`run not found: ${runId}`)
  }

  const filteredRuns = filterWithQuery(scopedRuns, query, toConfigQueryContext, (run) => run.id)
  const rows = filteredRuns.map(toConfigRow)

  printRows(rows, format, {
    totalConfigs: scopedRuns.length,
    matchedConfigs: filteredRuns.length,
    query: query.trim().length === 0 ? null : query,
    configs: filteredRuns.map((run) => ({
      runId: run.id,
      status: run.status,
      config: run.config,
      createdAt: run.createdAt,
    })),
  })
}

/** Exports a stored run record to JSON or task-level CSV. */
const runExportCommand = async (parsed: ParsedArgv): Promise<void> => {
  const commandPositionals = parsed.positionals.slice(1)
  const runId = getLastFlagValue(parsed, 'run-id') ?? commandPositionals[0]
  if (runId === undefined || runId.trim().length === 0) {
    throw new Error('missing run id. Use --run-id <runId>')
  }

  const run = await loadRunRecord(runId)
  if (run === null) {
    throw new Error(`run not found: ${runId}`)
  }

  const formatRaw = getLastFlagValue(parsed, 'format') ?? 'json'
  if (formatRaw !== 'json' && formatRaw !== 'csv') {
    throw new Error(`invalid --format value "${formatRaw}". Use: json, csv`)
  }

  const outputPath = getLastFlagValue(parsed, 'output')
  if (outputPath === undefined || outputPath.trim().length === 0) {
    throw new Error('missing output path. Use --output <file-path>')
  }

  await exportRun(run, formatRaw, outputPath)
  console.log(`exported run ${run.id} to ${outputPath}`)
}

/** Main command dispatcher for the foreach-agent CLI. */
export const main = async (argv: readonly string[] = process.argv.slice(2)): Promise<void> => {
  const parsed = parseArgv(argv)
  const command = parsed.positionals[0] ?? 'tui'

  if (hasFlag(parsed, 'help') || command === 'help') {
    console.log(HELP_TEXT)
    return
  }

  if (command === 'tui') {
    await runTui()
    return
  }

  if (command === 'run') {
    await runHeadlessCommand(parsed)
    return
  }

  if (command === 'templates') {
    await runTemplatesCommand(parsed)
    return
  }

  if (command === 'runs') {
    await runRunsCommand(parsed)
    return
  }

  if (command === 'tasks') {
    await runTasksCommand(parsed)
    return
  }

  if (command === 'configs') {
    await runConfigsCommand(parsed)
    return
  }

  if (command === 'export') {
    await runExportCommand(parsed)
    return
  }

  throw new Error(`unknown command "${command}". Use --help`)
}
