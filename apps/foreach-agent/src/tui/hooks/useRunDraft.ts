import { useState } from 'react'

import type { Provider } from '../../dtos/types.js'
import { DEFAULT_MODELS } from '../../providers/defaults.js'

/** Source mode for entries supplied during run setup. */
export type EntrySource = 'inline' | 'path'

/** Editable run setup state before execution starts. */
export interface RunDraft {
  /** Providers selected for task fan-out. */
  readonly selectedProviders: readonly Provider[]
  /** Model name for each provider. */
  readonly providerModels: Record<Provider, string>
  /** Maximum tasks to execute concurrently. */
  readonly concurrency: number
  /** Maximum attempts per task. */
  readonly retries: number
  /** Per-attempt timeout in seconds, or null for no timeout. */
  readonly timeoutSeconds: number | null
  /** Working directory for provider processes. */
  readonly cwd: string
  /** Whether providers should use unattended approval mode. */
  readonly autoApproval: boolean
  /** Whether entries come from inline text or a file path. */
  readonly entrySource: EntrySource
  /** Inline JSON or YAML entries text. */
  readonly entriesInline: string
  /** Entries file path when entrySource is path. */
  readonly entriesPath: string
}

/** Ordered focus targets in the run setup form. */
export const runSetupFields = [
  'provider:claude',
  'provider:cursor-agent',
  'provider:gemini',
  'provider:codex',
  'concurrency',
  'retries',
  'timeout',
  'cwd',
  'autoApproval',
  'entrySource',
  'entries',
  'start',
  'back',
] as const

/** Focusable field in the run setup form. */
export type RunSetupField = (typeof runSetupFields)[number]

/** Creates the default run setup draft. */
export const initialRunDraft = (): RunDraft => ({
  selectedProviders: ['claude'],
  providerModels: {
    claude: DEFAULT_MODELS.claude,
    'cursor-agent': DEFAULT_MODELS['cursor-agent'],
    gemini: DEFAULT_MODELS.gemini,
    codex: DEFAULT_MODELS.codex,
  },
  concurrency: 10,
  retries: 3,
  timeoutSeconds: null,
  cwd: process.cwd(),
  autoApproval: true,
  entrySource: 'inline',
  entriesInline: '[\n  {\n    "name": "world"\n  }\n]',
  entriesPath: '',
})

/** Owns editable run setup state and focused field index. */
export const useRunDraft = () => {
  const [runDraft, setRunDraft] = useState<RunDraft>(initialRunDraft)
  const [runSetupIndex, setRunSetupIndex] = useState(0)

  const updateDraft = (updater: (current: RunDraft) => RunDraft): void => {
    setRunDraft(updater)
  }

  const resetDraft = (): void => {
    setRunDraft(initialRunDraft())
    setRunSetupIndex(0)
  }

  return {
    draft: runDraft,
    fieldIndex: runSetupIndex,
    setFieldIndex: setRunSetupIndex,
    updateDraft,
    resetDraft,
  } as const
}
