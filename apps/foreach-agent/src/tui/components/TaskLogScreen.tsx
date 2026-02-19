import { Box, Text } from 'ink'
// biome-ignore lint/style/useImportType: required by SWC JSX runtime used in dev mode
import React from 'react'

import type { TaskRecord } from '../../dtos/types.js'
import { getStatusColor } from '../helpers/styles.js'

interface TaskLogScreenProps {
  readonly task: TaskRecord | null
  readonly scroll: number
}

const TaskLogScreen: React.FC<TaskLogScreenProps> = ({ task, scroll }) => {
  if (task === null) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          foreach-agent | task logs
        </Text>
        <Text color="yellow">No task selected.</Text>
        <Text dimColor>Esc back</Text>
      </Box>
    )
  }

  const allLines = task.prettyLogs
  const visible = allLines.slice(scroll, scroll + 24)

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        foreach-agent | task logs
      </Text>
      <Text>
        Task: <Text color="green">{task.id}</Text> | provider={task.provider} | status=
        <Text color={getStatusColor(task.status)}>{task.status}</Text>
      </Text>
      <Text>Prompt: {task.promptFilePath || '-'}</Text>
      <Text>Transcript: {task.transcriptFilePath}</Text>
      <Text dimColor>{'─'.repeat(100)}</Text>
      {visible.map((line, index) => {
        const color =
          line.level === 'error'
            ? 'red'
            : line.level === 'warn'
              ? 'yellow'
              : line.level === 'tool'
                ? 'magenta'
                : line.level === 'assistant'
                  ? 'green'
                  : 'gray'

        return (
          <Text key={`${line.ts}-${index}`} color={color as 'red' | 'yellow' | 'magenta' | 'green' | 'gray'}>
            [{new Date(line.ts).toLocaleTimeString()}] {line.text}
          </Text>
        )
      })}
      <Text dimColor>{'─'.repeat(100)}</Text>
      <Text dimColor>j/k scroll | Esc back</Text>
    </Box>
  )
}

export default TaskLogScreen
