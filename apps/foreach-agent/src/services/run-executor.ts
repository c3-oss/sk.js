import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'

import type { PrettyLogLine, RunConfig, RunRecord, TaskRecord } from '../dtos/types.js'
import { buildProviderCommand } from '../providers/commands.js'
import { parseProviderLine } from '../providers/normalize.js'
import { appendJsonLine } from '../utils/jsonl.js'
import { durationMs, nowIso } from '../utils/time.js'
import { buildTranscriptPath, createRunPaths, savePromptFile, saveRunRecord } from './store.js'
import { renderTemplate } from './template-engine.js'

interface ExecuteRunHandlers {
  readonly onRunUpdate?: (run: RunRecord) => void
  readonly onTaskUpdate?: (task: TaskRecord) => void
}

interface AttemptResult {
  readonly success: boolean
  readonly finalOutput?: string
  readonly errorMessage?: string
}

const trimLogs = (logs: readonly PrettyLogLine[]): readonly PrettyLogLine[] => {
  const maxLines = 300
  if (logs.length <= maxLines) {
    return logs
  }

  const truncationNotice: PrettyLogLine = {
    ts: new Date().toISOString(),
    level: 'system',
    text: `... truncated (showing last ${maxLines} lines)`,
  }

  return [truncationNotice, ...logs.slice(logs.length - (maxLines - 1))]
}

const appendTaskLog = (task: TaskRecord, line: PrettyLogLine): TaskRecord => ({
  ...task,
  prettyLogs: trimLogs([...task.prettyLogs, line]),
})

const updateTaskById = (run: RunRecord, taskId: string, mutator: (task: TaskRecord) => TaskRecord): RunRecord => ({
  ...run,
  tasks: run.tasks.map((task) => (task.id === taskId ? mutator(task) : task)),
})

const computeRunStatus = (tasks: readonly TaskRecord[]): RunRecord['status'] => {
  const hasRunning = tasks.some((task) => task.status === 'running' || task.status === 'pending')
  if (hasRunning) {
    return 'running'
  }

  const hasFailures = tasks.some((task) => task.status === 'failed' || task.status === 'timeout')
  return hasFailures ? 'failed' : 'completed'
}

const appendRawLine = async (
  transcriptFilePath: string,
  stream: 'stdout' | 'stderr' | 'meta',
  line: string,
  attempt: number,
): Promise<void> => {
  await appendJsonLine(transcriptFilePath, {
    ts: nowIso(),
    stream,
    attempt,
    line,
  })
}

const executeAttempt = async (
  task: TaskRecord,
  prompt: string,
  timeoutSeconds: number | null,
  autoApproval: boolean,
  onPrettyLog: (line: PrettyLogLine, outputDelta?: string, finalOutput?: string, errorMessage?: string) => void,
): Promise<AttemptResult> => {
  const command = buildProviderCommand({
    provider: task.provider,
    model: task.model,
    autoApproval,
    cwd: task.cwd,
  })

  await appendRawLine(task.transcriptFilePath, 'meta', `${command.command} ${command.args.join(' ')}`, task.attempt)

  return new Promise<AttemptResult>((resolve) => {
    let finished = false
    let timeoutId: NodeJS.Timeout | null = null
    let pendingOutput = ''
    let errorMessage: string | undefined
    let finalOutput: string | undefined
    let stdoutBuffer = ''
    let stderrBuffer = ''
    const pendingLineWork = new Set<Promise<void>>()

    const complete = (result: AttemptResult): void => {
      if (finished) {
        return
      }

      finished = true
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
      resolve(result)
    }

    const child = spawn(command.command, command.args, {
      cwd: task.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    const handleLine = async (stream: 'stdout' | 'stderr', rawLine: string): Promise<void> => {
      await appendRawLine(task.transcriptFilePath, stream, rawLine, task.attempt)
      if (finished) {
        return
      }
      const parsed = parseProviderLine(task.provider, rawLine)
      if (parsed.pretty !== undefined) {
        onPrettyLog(parsed.pretty, parsed.outputDelta, parsed.finalOutput, parsed.errorMessage)
      }

      if (parsed.outputDelta !== undefined) {
        pendingOutput = `${pendingOutput}${parsed.outputDelta}`
      }

      if (parsed.finalOutput !== undefined) {
        finalOutput = parsed.finalOutput
      }

      if (parsed.errorMessage !== undefined) {
        errorMessage = parsed.errorMessage
      }
    }

    const pushPendingLine = (stream: 'stdout' | 'stderr', line: string): void => {
      const job = handleLine(stream, line)
      pendingLineWork.add(job)
      void job.finally(() => {
        pendingLineWork.delete(job)
      })
    }

    const flushStreamBuffer = (stream: 'stdout' | 'stderr', force = false): void => {
      const buffer = stream === 'stdout' ? stdoutBuffer : stderrBuffer
      const lines = buffer.split(/\r?\n/)
      const completeLines = force ? lines : lines.slice(0, -1)
      const nextRemainder = force ? '' : (lines.at(-1) ?? '')

      if (stream === 'stdout') {
        stdoutBuffer = nextRemainder
      } else {
        stderrBuffer = nextRemainder
      }

      for (const line of completeLines) {
        if (line.trim().length > 0) {
          pushPendingLine(stream, line)
        }
      }
    }

    const wireStream = (stream: 'stdout' | 'stderr', data: Buffer): void => {
      const text = data.toString('utf-8')
      if (stream === 'stdout') {
        stdoutBuffer = `${stdoutBuffer}${text}`
      } else {
        stderrBuffer = `${stderrBuffer}${text}`
      }

      flushStreamBuffer(stream)
    }

    child.stdout.on('data', (data: Buffer) => {
      wireStream('stdout', data)
    })

    child.stderr.on('data', (data: Buffer) => {
      wireStream('stderr', data)
    })

    child.on('error', (errorValue) => {
      if (finished) {
        return
      }
      const message = errorValue instanceof Error ? errorValue.message : String(errorValue)
      onPrettyLog({ ts: nowIso(), level: 'error', text: message }, undefined, undefined, message)
      complete({ success: false, errorMessage: message })
    })

    child.on('close', (exitCode) => {
      flushStreamBuffer('stdout', true)
      flushStreamBuffer('stderr', true)

      void Promise.all([...pendingLineWork]).then(() => {
        if (exitCode !== 0) {
          const message = errorMessage ?? `process exited with code ${String(exitCode)}`
          complete({ success: false, errorMessage: message })
          return
        }

        if (errorMessage !== undefined) {
          complete({ success: false, errorMessage })
          return
        }

        const output = finalOutput ?? pendingOutput.trim()
        complete({ success: true, finalOutput: output })
      })
    })

    if (timeoutSeconds !== null) {
      timeoutId = setTimeout(() => {
        if (finished) {
          return
        }

        child.kill('SIGTERM')
        complete({ success: false, errorMessage: `timeout after ${timeoutSeconds}s` })
      }, timeoutSeconds * 1000)
    }

    child.stdin.write(prompt)
    child.stdin.end()
  })
}

export const executeRun = async (
  config: RunConfig,
  templateContent: string,
  handlers: ExecuteRunHandlers = {},
): Promise<RunRecord> => {
  await fs.mkdir(config.cwd, { recursive: true })

  const runPaths = await createRunPaths()

  const tasksDraft: TaskRecord[] = []

  for (const [entryIndex, entry] of config.entries.entries()) {
    for (const providerConfig of config.providers) {
      const taskId = `${providerConfig.provider}-${entryIndex + 1}-${randomUUID().slice(0, 8)}`
      const transcriptFilePath = buildTranscriptPath(runPaths.runId, taskId)

      try {
        const renderedPrompt = await renderTemplate(templateContent, entry)
        const promptFilePath = await savePromptFile(runPaths.runId, taskId, renderedPrompt)

        tasksDraft.push({
          id: taskId,
          runId: runPaths.runId,
          entryIndex,
          provider: providerConfig.provider,
          model: providerConfig.model,
          cwd: config.cwd,
          promptFilePath,
          transcriptFilePath,
          status: 'pending',
          attempt: 0,
          maxAttempts: Math.max(1, config.retries),
          prettyLogs: [],
        })
      } catch (errorValue) {
        const message = errorValue instanceof Error ? errorValue.message : String(errorValue)

        tasksDraft.push({
          id: taskId,
          runId: runPaths.runId,
          entryIndex,
          provider: providerConfig.provider,
          model: providerConfig.model,
          cwd: config.cwd,
          promptFilePath: '',
          transcriptFilePath,
          status: 'failed',
          attempt: 1,
          maxAttempts: Math.max(1, config.retries),
          errorMessage: `template render failed: ${message}`,
          prettyLogs: [{ ts: nowIso(), level: 'error', text: `template render failed: ${message}` }],
        })
      }
    }
  }

  let run: RunRecord = {
    id: runPaths.runId,
    createdAt: nowIso(),
    startedAt: nowIso(),
    status: 'running',
    config,
    tasks: tasksDraft,
  }

  const publishRun = async (): Promise<void> => {
    await saveRunRecord(run)
    handlers.onRunUpdate?.(run)
  }

  const publishTask = (task: TaskRecord): void => {
    handlers.onTaskUpdate?.(task)
  }

  await publishRun()

  const queue = run.tasks.filter((task) => task.status === 'pending').map((task) => task.id)

  const workerCount = Math.max(1, Math.min(config.concurrency, queue.length || 1))

  const runWorker = async (): Promise<void> => {
    while (true) {
      const taskId = queue.shift()
      if (taskId === undefined) {
        return
      }

      const initialTask = run.tasks.find((task) => task.id === taskId)
      if (initialTask === undefined) {
        continue
      }

      const prompt = await fs.readFile(initialTask.promptFilePath, 'utf-8').catch(() => '')

      let currentTask = initialTask

      for (let attempt = 1; attempt <= currentTask.maxAttempts; attempt += 1) {
        const startedAt = nowIso()
        run = updateTaskById(run, taskId, (task) => ({
          ...task,
          status: 'running',
          attempt,
          startedAt,
          errorMessage: undefined,
          outputText: undefined,
          prettyLogs: appendTaskLog(task, {
            ts: nowIso(),
            level: 'system',
            text: `attempt ${attempt}/${task.maxAttempts}`,
          }).prettyLogs,
        }))

        currentTask = run.tasks.find((task) => task.id === taskId) ?? currentTask
        publishTask(currentTask)
        await publishRun()

        const result = await executeAttempt(
          currentTask,
          prompt,
          config.timeoutSeconds,
          config.autoApproval,
          (logLine, outputDelta, finalOutput, parsedError) => {
            run = updateTaskById(run, taskId, (task) => {
              const withLog = appendTaskLog(task, logLine)
              const outputText =
                outputDelta === undefined ? withLog.outputText : `${withLog.outputText ?? ''}${outputDelta}`

              return {
                ...withLog,
                outputText,
                errorMessage: parsedError ?? withLog.errorMessage ?? undefined,
                ...(finalOutput !== undefined ? { outputText: finalOutput } : {}),
              }
            })

            const snapshotTask = run.tasks.find((task) => task.id === taskId)
            if (snapshotTask !== undefined) {
              publishTask(snapshotTask)
            }
          },
        )

        const finishedAt = nowIso()

        if (result.success) {
          run = updateTaskById(run, taskId, (task) => ({
            ...task,
            status: 'success',
            outputText: result.finalOutput ?? task.outputText,
            finishedAt,
            durationMs: durationMs(task.startedAt, finishedAt),
          }))

          currentTask = run.tasks.find((task) => task.id === taskId) ?? currentTask
          publishTask(currentTask)
          await publishRun()
          break
        }

        const isLastAttempt = attempt >= currentTask.maxAttempts
        const timeouted = result.errorMessage?.startsWith('timeout after ') ?? false

        run = updateTaskById(run, taskId, (task) => ({
          ...task,
          status: isLastAttempt ? (timeouted ? 'timeout' : 'failed') : 'running',
          errorMessage: result.errorMessage,
          finishedAt: isLastAttempt ? finishedAt : undefined,
          durationMs: isLastAttempt ? durationMs(task.startedAt, finishedAt) : undefined,
          prettyLogs: appendTaskLog(task, {
            ts: nowIso(),
            level: 'warn',
            text: isLastAttempt
              ? `attempt ${attempt} failed: ${result.errorMessage ?? 'unknown error'}`
              : `attempt ${attempt} failed, retrying: ${result.errorMessage ?? 'unknown error'}`,
          }).prettyLogs,
        }))

        currentTask = run.tasks.find((task) => task.id === taskId) ?? currentTask
        publishTask(currentTask)
        await publishRun()
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()))

  run = {
    ...run,
    status: computeRunStatus(run.tasks),
    finishedAt: nowIso(),
  }

  await publishRun()
  return run
}
