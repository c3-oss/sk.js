/** Provider identifiers accepted by foreach-agent run configuration. */
export const PROVIDERS = ['claude', 'cursor-agent', 'gemini', 'codex'] as const

/** Supported coding-agent provider name. */
export type Provider = (typeof PROVIDERS)[number]

/** Stored Liquid template file and its current content. */
export interface TemplateFile {
  /** Stable file-backed template identifier. */
  readonly id: string
  /** Display name shown in CLI and TUI listings. */
  readonly name: string
  /** Absolute path to the template file on disk. */
  readonly filePath: string
  /** Raw Liquid template source. */
  readonly content: string
  /** Last modification time as an ISO timestamp. */
  readonly updatedAt: string
}

/** Lifecycle state for a single provider/entry task. */
export type TaskStatus = 'pending' | 'running' | 'success' | 'failed' | 'timeout'

/** Normalized log event shown in the TUI and persisted with a task. */
export interface PrettyLogLine {
  /** Event timestamp as an ISO string. */
  readonly ts: string
  /** Presentation and severity bucket for the line. */
  readonly level: 'info' | 'warn' | 'error' | 'tool' | 'assistant' | 'system'
  /** Human-readable log content. */
  readonly text: string
}

/** Persisted execution state for one rendered prompt sent to one provider. */
export interface TaskRecord {
  /** Stable task identifier within a run. */
  readonly id: string
  /** Parent run identifier. */
  readonly runId: string
  /** Zero-based index of the source entry used to render the prompt. */
  readonly entryIndex: number
  /** Provider used to execute the rendered prompt. */
  readonly provider: Provider
  /** Provider model selected for this task. */
  readonly model: string
  /** Working directory used when launching the provider command. */
  readonly cwd: string
  /** Absolute path to the rendered prompt file. */
  readonly promptFilePath: string
  /** Absolute path to the raw JSONL transcript. */
  readonly transcriptFilePath: string
  /** First attempt start time as an ISO timestamp. */
  readonly startedAt?: string
  /** Final attempt finish time as an ISO timestamp. */
  readonly finishedAt?: string
  /** Elapsed task duration in milliseconds. */
  readonly durationMs?: number
  /** Current or final task status. */
  readonly status: TaskStatus
  /** Current or final attempt number, starting at 1 when execution begins. */
  readonly attempt: number
  /** Maximum attempts allowed for this task. */
  readonly maxAttempts: number
  /** Provider output captured for display and exports. */
  readonly outputText?: string
  /** Latest failure message reported by the provider or runner. */
  readonly errorMessage?: string
  /** Bounded, normalized log lines for terminal display. */
  readonly prettyLogs: readonly PrettyLogLine[]
}

/** Lifecycle state for an entire run. */
export type RunStatus = 'pending' | 'running' | 'completed' | 'failed'

/** Provider and model pair used to fan out each entry. */
export interface ProviderConfig {
  /** Provider that will execute a task. */
  readonly provider: Provider
  /** Model name passed to the provider CLI. */
  readonly model: string
}

/** Immutable configuration captured when a run is started. */
export interface RunConfig {
  /** Template identifier used for the run. */
  readonly templateId: string
  /** Template display name at run start. */
  readonly templateName: string
  /** Template path at run start. */
  readonly templatePath: string
  /** Providers and models used for each entry. */
  readonly providers: readonly ProviderConfig[]
  /** Structured data entries rendered into the template. */
  readonly entries: readonly Record<string, unknown>[]
  /** Maximum number of tasks executing at once. */
  readonly concurrency: number
  /** Maximum task attempts. */
  readonly retries: number
  /** Per-attempt timeout in seconds, or null for no timeout. */
  readonly timeoutSeconds: number | null
  /** Whether provider CLIs should use their unattended approval mode. */
  readonly autoApproval: boolean
  /** Working directory for provider processes. */
  readonly cwd: string
}

/** Persisted run with configuration, timestamps, and task records. */
export interface RunRecord {
  /** Stable run identifier and storage directory name. */
  readonly id: string
  /** Run creation time as an ISO timestamp. */
  readonly createdAt: string
  /** Run start time as an ISO timestamp. */
  readonly startedAt?: string
  /** Run finish time as an ISO timestamp. */
  readonly finishedAt?: string
  /** Current or final run status. */
  readonly status: RunStatus
  /** Configuration used to create the run. */
  readonly config: RunConfig
  /** All tasks generated for the run. */
  readonly tasks: readonly TaskRecord[]
}

/** Compact run row for history listings. */
export interface RunSummary {
  /** Run identifier. */
  readonly id: string
  /** Run creation time as an ISO timestamp. */
  readonly createdAt: string
  /** Current or final run status. */
  readonly status: RunStatus
  /** Template display name. */
  readonly templateName: string
  /** Unique providers used in the run. */
  readonly providers: readonly Provider[]
  /** Total task count. */
  readonly totalTasks: number
  /** Number of successful tasks. */
  readonly successTasks: number
  /** Number of failed or timed-out tasks. */
  readonly failedTasks: number
}

/** Patch event for a task record. */
export interface TaskUpdate {
  /** Task being updated. */
  readonly taskId: string
  /** Partial task fields to merge. */
  readonly patch: Partial<TaskRecord>
}

/** Patch event for a run record. */
export interface RunUpdate {
  /** Run being updated. */
  readonly runId: string
  /** Partial run fields to merge. */
  readonly patch: Partial<RunRecord>
}
