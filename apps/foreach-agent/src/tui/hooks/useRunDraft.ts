import { useState } from 'react'

import type { Provider } from '../../dtos/types.js'
import { DEFAULT_MODELS } from '../../providers/defaults.js'

export type EntrySource = 'inline' | 'path'

export interface RunDraft {
  readonly selectedProviders: readonly Provider[]
  readonly providerModels: Record<Provider, string>
  readonly concurrency: number
  readonly retries: number
  readonly timeoutSeconds: number | null
  readonly cwd: string
  readonly autoApproval: boolean
  readonly entrySource: EntrySource
  readonly entriesInline: string
  readonly entriesPath: string
}

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

export type RunSetupField = (typeof runSetupFields)[number]

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
