import { Box, Text } from 'ink'
// biome-ignore lint/style/useImportType: required by SWC JSX runtime used in dev mode
import React from 'react'

import type { Provider, RunSummary } from '../../dtos/types.js'
import type { DateFilter, RunStatusFilter } from '../helpers/styles.js'
import { getStatusColor } from '../helpers/styles.js'

interface RunsHistoryScreenProps {
  readonly runs: readonly RunSummary[]
  readonly selectedIndex: number
  readonly statusFilter: RunStatusFilter
  readonly providerFilter: Provider | 'all'
  readonly dateFilter: DateFilter
  readonly search: string
}

const RunsHistoryScreen: React.FC<RunsHistoryScreenProps> = ({
  runs,
  selectedIndex,
  statusFilter,
  providerFilter,
  dateFilter,
  search,
}) => {
  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        foreach-agent | runs history
      </Text>
      <Text>
        Filters: status=<Text color="yellow">{statusFilter}</Text> provider=
        <Text color="yellow">{providerFilter}</Text> date=<Text color="yellow">{dateFilter}</Text>
      </Text>
      <Text>
        Search: <Text color="yellow">{search || '-'}</Text>
      </Text>
      <Text dimColor>{'─'.repeat(100)}</Text>
      {runs.length === 0 ? (
        <Text color="yellow">No runs match current filters.</Text>
      ) : (
        runs.map((run, index) => {
          const selected = index === selectedIndex
          const statusColor = getStatusColor(run.status)
          return (
            <Text key={run.id} color={selected ? 'cyan' : undefined}>
              {selected ? '>' : ' '} {run.id} | <Text color={statusColor}>{run.status}</Text> | tpl={run.templateName} |
              providers={run.providers.join(',')} | ok={run.successTasks}/{run.totalTasks}
            </Text>
          )
        })
      )}
      <Text dimColor>{'─'.repeat(100)}</Text>
      <Text dimColor>j/k move | Enter open run | s status | p provider | d date | / search | R refresh | Esc back</Text>
    </Box>
  )
}

export default RunsHistoryScreen
