import path from 'node:path'

import { Box, useApp, useInput } from 'ink'
// biome-ignore lint/style/useImportType: required by SWC JSX runtime used in dev mode
import React, { useEffect, useRef, useState } from 'react'

import type { Provider } from '../dtos/types.js'
import { createTemplate, deleteTemplate, exportRun, updateTemplate } from '../services/store.js'
import { EXPORTS_DIR } from '../utils/path.js'
import InputOverlay from './components/InputOverlay.js'
import MonitorScreen from './components/MonitorScreen.js'
import RunSetupScreen from './components/RunSetupScreen.js'
import RunsHistoryScreen from './components/RunsHistoryScreen.js'
import StatusBar from './components/StatusBar.js'
import TaskLogScreen from './components/TaskLogScreen.js'
import TemplatesScreen from './components/TemplatesScreen.js'
import type { InputMode } from './hooks/useInputMode.js'
import { useInputMode } from './hooks/useInputMode.js'
import { useRunDraft } from './hooks/useRunDraft.js'
import { runSetupFields } from './hooks/useRunDraft.js'
import { useRunExecution } from './hooks/useRunExecution.js'
import { useRunFilters } from './hooks/useRunFilters.js'
import { useStore } from './hooks/useStore.js'
import { useTaskFilters } from './hooks/useTaskFilters.js'

/** TUI screen identifiers used for keyboard routing and initial navigation. */
export type AppScreen = 'templates' | 'run-setup' | 'monitor' | 'runs' | 'task-log'

/** Initial navigation options for launching the TUI from CLI commands. */
interface AppProps {
  /** Screen shown when the TUI starts. */
  readonly initialScreen?: AppScreen
  /** Run id loaded into monitor when starting from tasks or history commands. */
  readonly initialRunId?: string
}

/** Main Ink application component for template, run setup, monitor, and history screens. */
const App: React.FC<AppProps> = ({ initialScreen = 'templates', initialRunId }) => {
  const { exit } = useApp()
  const hasBootstrappedInitialRunRef = useRef(false)

  const [screen, setScreen] = useState<AppScreen>(initialScreen)
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0)
  const [selectedRunIndex, setSelectedRunIndex] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')
  const [deleteConfirmPending, setDeleteConfirmPending] = useState(false)

  const { templates, runs, loadAll } = useStore()
  const { draft, fieldIndex, setFieldIndex, updateDraft, resetDraft } = useRunDraft()
  const { inputMode, pendingTemplateName, setPendingTemplateName, openSingle, openMulti, cancel, updateBuffer } =
    useInputMode()
  const {
    activeRun,
    isRunning,
    selectedTaskIndex,
    setSelectedTaskIndex,
    taskLogScroll,
    setTaskLogScroll,
    startRun,
    loadRun,
  } = useRunExecution(setStatusMessage, loadAll)
  const taskFilters = useTaskFilters(activeRun?.tasks ?? [])
  const runFilters = useRunFilters(runs)

  const selectedTemplate = templates[selectedTemplateIndex] ?? null
  const selectedTask = taskFilters.filteredTasks[selectedTaskIndex] ?? null

  useEffect(() => {
    setSelectedTemplateIndex((current) => Math.min(current, Math.max(0, templates.length - 1)))
  }, [templates.length])

  useEffect(() => {
    setSelectedRunIndex((current) => Math.min(current, Math.max(0, runFilters.filteredRuns.length - 1)))
  }, [runFilters.filteredRuns.length])

  useEffect(() => {
    setSelectedTaskIndex((current) => Math.min(current, Math.max(0, taskFilters.filteredTasks.length - 1)))
  }, [taskFilters.filteredTasks.length, setSelectedTaskIndex])

  useEffect(() => {
    if (initialRunId === undefined || hasBootstrappedInitialRunRef.current) {
      return
    }

    hasBootstrappedInitialRunRef.current = true
    void loadRun(initialRunId).then((loaded) => {
      if (loaded) {
        setScreen('monitor')
      }
    })
  }, [initialRunId, loadRun])

  const handleSingleSubmit = async (mode: Extract<InputMode, { kind: 'single' }>): Promise<void> => {
    const value = mode.buffer.trim()

    if (mode.intent === 'create-template-name') {
      if (value.length === 0) {
        setStatusMessage('template name cannot be empty')
        cancel()
        return
      }
      setPendingTemplateName(value)
      openMulti('create-template-content', `Template content for ${value}`, '')
      return
    }

    if (mode.intent === 'run-edit-model') {
      const provider = mode.meta?.provider as Provider | undefined
      if (provider !== undefined && value.length > 0) {
        updateDraft((current) => ({
          ...current,
          providerModels: { ...current.providerModels, [provider]: value },
        }))
      }
      cancel()
      return
    }

    if (mode.intent === 'run-edit-concurrency') {
      const parsed = Number.parseInt(value, 10)
      if (Number.isNaN(parsed) || parsed < 1) {
        setStatusMessage('concurrency must be a positive integer')
      } else {
        updateDraft((current) => ({ ...current, concurrency: parsed }))
      }
      cancel()
      return
    }

    if (mode.intent === 'run-edit-retries') {
      const parsed = Number.parseInt(value, 10)
      if (Number.isNaN(parsed) || parsed < 1) {
        setStatusMessage('retries must be >= 1')
      } else {
        updateDraft((current) => ({ ...current, retries: parsed }))
      }
      cancel()
      return
    }

    if (mode.intent === 'run-edit-timeout') {
      if (value.length === 0 || value.toLowerCase() === 'infinite') {
        updateDraft((current) => ({ ...current, timeoutSeconds: null }))
      } else {
        const parsed = Number.parseInt(value, 10)
        if (Number.isNaN(parsed) || parsed < 20) {
          setStatusMessage('timeout must be >= 20 seconds, or blank for infinite')
        } else {
          updateDraft((current) => ({ ...current, timeoutSeconds: parsed }))
        }
      }
      cancel()
      return
    }

    if (mode.intent === 'run-edit-cwd') {
      updateDraft((current) => ({ ...current, cwd: value.length > 0 ? value : process.cwd() }))
      cancel()
      return
    }

    if (mode.intent === 'run-edit-path') {
      updateDraft((current) => ({ ...current, entriesPath: value }))
      cancel()
      return
    }

    if (mode.intent === 'monitor-search') {
      taskFilters.setSearch(mode.buffer)
      cancel()
      return
    }

    if (mode.intent === 'runs-search') {
      runFilters.setSearch(mode.buffer)
      cancel()
      return
    }

    if (mode.intent === 'monitor-export-json' || mode.intent === 'monitor-export-csv') {
      if (activeRun === null) {
        cancel()
        return
      }
      const format = mode.intent === 'monitor-export-json' ? 'json' : 'csv'
      const defaultPath = path.join(EXPORTS_DIR, `${activeRun.id}.${format}`)
      const outputPath = value.length === 0 ? defaultPath : path.resolve(value)
      try {
        await exportRun(activeRun, format, outputPath)
        setStatusMessage(`exported ${format.toUpperCase()} to ${outputPath}`)
      } catch (errorValue) {
        const message = errorValue instanceof Error ? errorValue.message : String(errorValue)
        setStatusMessage(`export failed: ${message}`)
      }
      cancel()
    }
  }

  const handleMultiSubmit = async (mode: Extract<InputMode, { kind: 'multi' }>): Promise<void> => {
    if (mode.intent === 'create-template-content') {
      try {
        await createTemplate(pendingTemplateName, mode.buffer)
        await loadAll()
        setStatusMessage(`template ${pendingTemplateName} created`)
      } catch (errorValue) {
        const message = errorValue instanceof Error ? errorValue.message : String(errorValue)
        setStatusMessage(`failed creating template: ${message}`)
      }
      setPendingTemplateName('')
      cancel()
      return
    }

    if (mode.intent === 'edit-template-content') {
      const id = mode.meta?.templateId
      if (id === undefined) {
        cancel()
        return
      }
      try {
        await updateTemplate(id, mode.buffer)
        await loadAll()
        setStatusMessage(`template ${id} updated`)
      } catch (errorValue) {
        const message = errorValue instanceof Error ? errorValue.message : String(errorValue)
        setStatusMessage(`failed updating template: ${message}`)
      }
      cancel()
      return
    }

    if (mode.intent === 'run-inline-entries') {
      updateDraft((current) => ({ ...current, entriesInline: mode.buffer }))
      cancel()
    }
  }

  const handleEnterOnRunSetup = async (): Promise<void> => {
    const field = runSetupFields[fieldIndex]
    if (field === undefined) return

    if (field.startsWith('provider:')) {
      const provider = field.replace('provider:', '') as Provider
      openSingle('run-edit-model', `Model for ${provider}`, draft.providerModels[provider], { provider })
      return
    }

    switch (field) {
      case 'concurrency':
        openSingle('run-edit-concurrency', 'Concurrency', String(draft.concurrency))
        break
      case 'retries':
        openSingle('run-edit-retries', 'Retries (attempts)', String(draft.retries))
        break
      case 'timeout':
        openSingle('run-edit-timeout', 'Timeout seconds (blank = infinite)', draft.timeoutSeconds?.toString() ?? '')
        break
      case 'cwd':
        openSingle('run-edit-cwd', 'Run cwd', draft.cwd)
        break
      case 'entries':
        if (draft.entrySource === 'inline') {
          openMulti('run-inline-entries', 'Inline entries (JSON or YAML)', draft.entriesInline)
        } else {
          openSingle('run-edit-path', 'Absolute path to JSON/YAML file', draft.entriesPath)
        }
        break
      case 'start':
        if (selectedTemplate === null) {
          setStatusMessage('select a template first')
          return
        }
        if (await startRun(selectedTemplate, draft)) {
          setScreen('monitor')
        }
        break
      case 'back':
        setScreen('templates')
        break
    }
  }

  useInput((input, key) => {
    if (inputMode.kind === 'single') {
      if (key.escape) {
        cancel()
        return
      }
      if (key.return) {
        void handleSingleSubmit(inputMode)
        return
      }
      if (key.backspace || key.delete) {
        updateBuffer((buf) => buf.slice(0, -1))
        return
      }
      if (input.length === 1 && !key.ctrl && !key.meta) {
        updateBuffer((buf) => `${buf}${input}`)
      }
      return
    }

    if (inputMode.kind === 'multi') {
      if (key.escape) {
        cancel()
        return
      }
      if (key.ctrl && (input === 's' || input === 'S')) {
        void handleMultiSubmit(inputMode)
        return
      }
      if (key.ctrl && (input === 'l' || input === 'L')) {
        updateBuffer(() => '')
        return
      }
      if (key.backspace || key.delete) {
        updateBuffer((buf) => buf.slice(0, -1))
        return
      }
      if (key.return) {
        updateBuffer((buf) => `${buf}\n`)
        return
      }
      if (input.length === 1 && !key.ctrl && !key.meta) {
        updateBuffer((buf) => `${buf}${input}`)
      }
      return
    }

    if (input === 'q' && screen !== 'task-log') {
      exit()
      return
    }

    if (screen === 'templates') {
      if (deleteConfirmPending && input !== 'd') {
        setDeleteConfirmPending(false)
        setStatusMessage('')
      }

      if (key.upArrow || input === 'k') {
        setSelectedTemplateIndex((current) => Math.max(0, current - 1))
      } else if (key.downArrow || input === 'j') {
        setSelectedTemplateIndex((current) => Math.min(Math.max(0, templates.length - 1), current + 1))
      } else if (input === 'n') {
        openSingle('create-template-name', 'New template file name', 'template')
      } else if (input === 'e' && selectedTemplate !== null) {
        openMulti('edit-template-content', `Edit ${selectedTemplate.name}`, selectedTemplate.content, {
          templateId: selectedTemplate.id,
        })
      } else if (input === 'd' && selectedTemplate !== null) {
        if (deleteConfirmPending) {
          setDeleteConfirmPending(false)
          void deleteTemplate(selectedTemplate.id)
            .then(() => loadAll())
            .then(() => {
              setStatusMessage(`template ${selectedTemplate.id} removed`)
            })
            .catch((errorValue) => {
              const message = errorValue instanceof Error ? errorValue.message : String(errorValue)
              setStatusMessage(`delete failed: ${message}`)
            })
        } else {
          setDeleteConfirmPending(true)
          setStatusMessage('press d again to confirm deletion')
        }
      } else if (input === 'r' && selectedTemplate !== null) {
        resetDraft()
        setScreen('run-setup')
      } else if (input === 'u') {
        void loadAll().then(() => setScreen('runs'))
      } else if (input === 'R') {
        void loadAll()
      }
      return
    }

    if (screen === 'run-setup') {
      if (key.escape) {
        setScreen('templates')
        return
      }
      if (key.upArrow || input === 'k') {
        setFieldIndex((current) => Math.max(0, current - 1))
        return
      }
      if (key.downArrow || input === 'j') {
        setFieldIndex((current) => Math.min(runSetupFields.length - 1, current + 1))
        return
      }

      const field = runSetupFields[fieldIndex]
      if (field === undefined) return

      if (input === ' ' && field.startsWith('provider:')) {
        const provider = field.replace('provider:', '') as Provider
        updateDraft((current) => {
          const hasProvider = current.selectedProviders.includes(provider)
          if (hasProvider && current.selectedProviders.length === 1) {
            setStatusMessage('at least one provider must stay selected')
            return current
          }
          const next = hasProvider
            ? current.selectedProviders.filter((item) => item !== provider)
            : [...current.selectedProviders, provider]
          return { ...current, selectedProviders: next }
        })
        return
      }

      if (input === ' ' && field === 'autoApproval') {
        updateDraft((current) => ({ ...current, autoApproval: !current.autoApproval }))
        return
      }

      if (input === ' ' && field === 'entrySource') {
        updateDraft((current) => ({ ...current, entrySource: current.entrySource === 'inline' ? 'path' : 'inline' }))
        return
      }

      if (key.return) {
        void handleEnterOnRunSetup()
      }
      return
    }

    if (screen === 'runs') {
      if (key.escape) {
        setScreen('templates')
        return
      }
      if (key.upArrow || input === 'k') {
        setSelectedRunIndex((current) => Math.max(0, current - 1))
        return
      }
      if (key.downArrow || input === 'j') {
        setSelectedRunIndex((current) => Math.min(Math.max(0, runFilters.filteredRuns.length - 1), current + 1))
        return
      }
      if (input === 's') {
        runFilters.cycleStatus()
        return
      }
      if (input === 'p') {
        runFilters.cycleProvider()
        return
      }
      if (input === 'd') {
        runFilters.cycleDate()
        return
      }
      if (input === '/') {
        openSingle('runs-search', 'Runs search filter', runFilters.search)
        return
      }
      if (input === 'R') {
        void loadAll()
        return
      }
      if (key.return) {
        const selected = runFilters.filteredRuns[selectedRunIndex]
        if (selected !== undefined) {
          void loadRun(selected.id).then((loaded) => {
            if (loaded) setScreen('monitor')
          })
        }
      }
      return
    }

    if (screen === 'monitor') {
      if (key.escape) {
        setScreen('templates')
        return
      }
      if (key.upArrow || input === 'k') {
        setSelectedTaskIndex((current) => Math.max(0, current - 1))
        return
      }
      if (key.downArrow || input === 'j') {
        setSelectedTaskIndex((current) => Math.min(Math.max(0, taskFilters.filteredTasks.length - 1), current + 1))
        return
      }
      if (input === 's') {
        taskFilters.cycleStatus()
        return
      }
      if (input === 'p') {
        taskFilters.cycleProvider()
        return
      }
      if (input === '/') {
        openSingle('monitor-search', 'Task search filter', taskFilters.search)
        return
      }
      if (input === 'x' && activeRun !== null) {
        openSingle(
          'monitor-export-json',
          'Export JSON path (blank for default)',
          path.join(EXPORTS_DIR, `${activeRun.id}.json`),
        )
        return
      }
      if (input === 'X' && activeRun !== null) {
        openSingle(
          'monitor-export-csv',
          'Export CSV path (blank for default)',
          path.join(EXPORTS_DIR, `${activeRun.id}.csv`),
        )
        return
      }
      if (input === 'u') {
        void loadAll().then(() => setScreen('runs'))
        return
      }
      if (key.return && selectedTask !== null) {
        setTaskLogScroll(0)
        setScreen('task-log')
      }
      return
    }

    if (screen === 'task-log') {
      if (key.escape || input === 'q') {
        setScreen('monitor')
        return
      }
      if (key.upArrow || input === 'k') {
        setTaskLogScroll((current) => Math.max(0, current - 1))
        return
      }
      if (key.downArrow || input === 'j') {
        setTaskLogScroll((current) => current + 1)
      }
    }
  })

  return (
    <Box flexDirection="column" paddingX={1}>
      {screen === 'templates' && <TemplatesScreen templates={templates} selectedIndex={selectedTemplateIndex} />}
      {screen === 'run-setup' && <RunSetupScreen template={selectedTemplate} draft={draft} fieldIndex={fieldIndex} />}
      {screen === 'runs' && (
        <RunsHistoryScreen
          runs={runFilters.filteredRuns}
          selectedIndex={selectedRunIndex}
          statusFilter={runFilters.statusFilter}
          providerFilter={runFilters.providerFilter}
          dateFilter={runFilters.dateFilter}
          search={runFilters.search}
        />
      )}
      {screen === 'monitor' && (
        <MonitorScreen
          run={activeRun}
          visibleTasks={taskFilters.filteredTasks}
          selectedTaskIndex={selectedTaskIndex}
          isRunning={isRunning}
          statusFilter={taskFilters.statusFilter}
          providerFilter={taskFilters.providerFilter}
          search={taskFilters.search}
        />
      )}
      {screen === 'task-log' && <TaskLogScreen task={selectedTask} scroll={taskLogScroll} />}

      <InputOverlay mode={inputMode} />
      <StatusBar message={statusMessage} />
    </Box>
  )
}

export default App
