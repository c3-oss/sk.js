export const PROVIDERS = ['claude', 'cursor-agent', 'gemini', 'codex'] as const

export type Provider = (typeof PROVIDERS)[number]

export interface TemplateFile {
  readonly id: string
  readonly name: string
  readonly filePath: string
  readonly content: string
  readonly updatedAt: string
}

export type TaskStatus = 'pending' | 'running' | 'success' | 'failed' | 'timeout'

export interface PrettyLogLine {
  readonly ts: string
  readonly level: 'info' | 'warn' | 'error' | 'tool' | 'assistant' | 'system'
  readonly text: string
}

export interface TaskRecord {
  readonly id: string
  readonly runId: string
  readonly entryIndex: number
  readonly provider: Provider
  readonly model: string
  readonly cwd: string
  readonly promptFilePath: string
  readonly transcriptFilePath: string
  readonly startedAt?: string
  readonly finishedAt?: string
  readonly durationMs?: number
  readonly status: TaskStatus
  readonly attempt: number
  readonly maxAttempts: number
  readonly outputText?: string
  readonly errorMessage?: string
  readonly prettyLogs: readonly PrettyLogLine[]
}

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface ProviderConfig {
  readonly provider: Provider
  readonly model: string
}

export interface RunConfig {
  readonly templateId: string
  readonly templateName: string
  readonly templatePath: string
  readonly providers: readonly ProviderConfig[]
  readonly entries: readonly Record<string, unknown>[]
  readonly concurrency: number
  readonly retries: number
  readonly timeoutSeconds: number | null
  readonly autoApproval: boolean
  readonly cwd: string
}

export interface RunRecord {
  readonly id: string
  readonly createdAt: string
  readonly startedAt?: string
  readonly finishedAt?: string
  readonly status: RunStatus
  readonly config: RunConfig
  readonly tasks: readonly TaskRecord[]
}

export interface RunSummary {
  readonly id: string
  readonly createdAt: string
  readonly status: RunStatus
  readonly templateName: string
  readonly providers: readonly Provider[]
  readonly totalTasks: number
  readonly successTasks: number
  readonly failedTasks: number
}

export interface TaskUpdate {
  readonly taskId: string
  readonly patch: Partial<TaskRecord>
}

export interface RunUpdate {
  readonly runId: string
  readonly patch: Partial<RunRecord>
}
