import { Box, Text } from 'ink'
// biome-ignore lint/style/useImportType: required by SWC JSX runtime used in dev mode
import React from 'react'

import type { Provider, RunRecord, TaskRecord } from '../../dtos/types.js'
import { formatDuration } from '../../utils/time.js'
import type { TaskStatusFilter } from '../helpers/styles.js'
import { getStatusColor } from '../helpers/styles.js'

interface MonitorScreenProps {
  readonly run: RunRecord | null
  readonly visibleTasks: readonly TaskRecord[]
  readonly selectedTaskIndex: number
  readonly isRunning: boolean
  readonly statusFilter: TaskStatusFilter
  readonly providerFilter: Provider | 'all'
  readonly search: string
}

const MonitorScreen: React.FC<MonitorScreenProps> = ({
  run,
  visibleTasks,
  selectedTaskIndex,
  isRunning,
  statusFilter,
  providerFilter,
  search,
}) => {
  if (run === null) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          foreach-agent | monitor
        </Text>
        <Text color="yellow">No active run loaded.</Text>
        <Text dimColor>Esc back | u open run history</Text>
      </Box>
    )
  }

  const success = run.tasks.filter((task) => task.status === 'success').length
  const failed = run.tasks.filter((task) => task.status === 'failed' || task.status === 'timeout').length
  const running = run.tasks.filter((task) => task.status === 'running').length

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        foreach-agent | run monitor
      </Text>
      <Text>
        Run: <Text color="green">{run.id}</Text> | status: <Text color={getStatusColor(run.status)}>{run.status}</Text>{' '}
        | template: {run.config.templateName}
      </Text>
      <Text>
        Tasks: total={run.tasks.length} running=<Text color="yellow">{running}</Text> success=
        <Text color="green">{success}</Text> failed=<Text color="red">{failed}</Text> | live=
        {isRunning ? 'yes' : 'no'}
      </Text>
      <Text>
        Filters: status=<Text color="yellow">{statusFilter}</Text> provider=
        <Text color="yellow">{providerFilter}</Text> search=<Text color="yellow">{search || '-'}</Text>
      </Text>
      <Text dimColor>{'─'.repeat(100)}</Text>
      {visibleTasks.length === 0 ? (
        <Text color="yellow">No tasks match filters.</Text>
      ) : (
        visibleTasks.map((task, index) => {
          const selected = index === selectedTaskIndex
          const statusColor = getStatusColor(task.status)
          return (
            <Text key={task.id} color={selected ? 'cyan' : undefined}>
              {selected ? '>' : ' '} [{task.entryIndex + 1}] {task.provider} ({task.model}) |{' '}
              <Text color={statusColor}>{task.status}</Text> | attempt {task.attempt}/{task.maxAttempts} | duration{' '}
              {formatDuration(task.durationMs)}
            </Text>
          )
        })
      )}
      <Text dimColor>{'─'.repeat(100)}</Text>
      <Text dimColor>
        j/k move | Enter logs | s status filter | p provider filter | / search | x export json | X export csv | u runs |
        Esc back
      </Text>
    </Box>
  )
}

export default MonitorScreen
