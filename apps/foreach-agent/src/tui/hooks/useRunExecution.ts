import { useEffect, useState } from 'react'
import type { RunRecord, TemplateFile } from '../../dtos/types.js'
import { parseEntriesFromAbsolutePath, parseEntriesFromText } from '../../services/entries-parser.js'
import { executeRun } from '../../services/run-executor.js'
import { loadRunRecord } from '../../services/store.js'
import { validateTemplateWithEntries } from '../../services/template-engine.js'
import type { RunDraft } from './useRunDraft.js'

/** Starts, tracks, and loads runs for the TUI monitor flow. */
export const useRunExecution = (onStatusMessage: (message: string) => void, onLoadAll: () => Promise<void>) => {
  const [activeRun, setActiveRun] = useState<RunRecord | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0)
  const [taskLogScroll, setTaskLogScroll] = useState(0)

  const visibleTasksCount = activeRun?.tasks.length ?? 0

  useEffect(() => {
    setSelectedTaskIndex((current) => Math.min(current, Math.max(0, visibleTasksCount - 1)))
  }, [visibleTasksCount])

  const startRun = async (template: TemplateFile, draft: RunDraft): Promise<boolean> => {
    if (draft.selectedProviders.length === 0) {
      onStatusMessage('at least one provider must be selected')
      return false
    }

    let entries: readonly Record<string, unknown>[]
    try {
      entries =
        draft.entrySource === 'inline'
          ? parseEntriesFromText(draft.entriesInline)
          : await parseEntriesFromAbsolutePath(draft.entriesPath)
    } catch (errorValue) {
      const message = errorValue instanceof Error ? errorValue.message : String(errorValue)
      onStatusMessage(`entries error: ${message}`)
      return false
    }

    const validationErrors = await validateTemplateWithEntries(template.content, entries)
    if (validationErrors.length > 0) {
      const first = validationErrors[0]
      if (first !== undefined) {
        onStatusMessage(`template render failed on entry ${first.index}: ${first.message}`)
      }
      return false
    }

    const config = {
      templateId: template.id,
      templateName: template.name,
      templatePath: template.filePath,
      providers: draft.selectedProviders.map((provider) => ({
        provider,
        model: draft.providerModels[provider],
      })),
      entries,
      concurrency: draft.concurrency,
      retries: draft.retries,
      timeoutSeconds: draft.timeoutSeconds,
      autoApproval: draft.autoApproval,
      cwd: draft.cwd,
    } as const

    setIsRunning(true)
    onStatusMessage('run started')
    setTaskLogScroll(0)
    setSelectedTaskIndex(0)

    void executeRun(config, template.content, {
      onRunUpdate: (run) => {
        setActiveRun(run)
      },
      onTaskUpdate: (task) => {
        setActiveRun((current) => {
          if (current === null || current.id !== task.runId) {
            return current
          }

          const index = current.tasks.findIndex((item) => item.id === task.id)
          if (index < 0) {
            return current
          }

          const nextTasks = [...current.tasks]
          nextTasks[index] = task
          return { ...current, tasks: nextTasks }
        })
      },
    })
      .then(async (finalRun) => {
        setActiveRun(finalRun)
        setIsRunning(false)
        onStatusMessage(`run ${finalRun.id} finished with status ${finalRun.status}`)
        await onLoadAll()
      })
      .catch((errorValue) => {
        const message = errorValue instanceof Error ? errorValue.message : String(errorValue)
        onStatusMessage(`run failed: ${message}`)
        setIsRunning(false)
      })

    return true
  }

  const loadRun = async (runId: string): Promise<boolean> => {
    const run = await loadRunRecord(runId)
    if (run === null) {
      onStatusMessage(`run ${runId} not found`)
      return false
    }

    setActiveRun(run)
    setSelectedTaskIndex(0)
    return true
  }

  return {
    activeRun,
    isRunning,
    selectedTaskIndex,
    setSelectedTaskIndex,
    taskLogScroll,
    setTaskLogScroll,
    startRun,
    loadRun,
  } as const
}
