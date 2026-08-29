import { useMemo, useState } from 'react'

import type { Provider, TaskRecord } from '../../dtos/types.js'
import { cycle, listStatusFilters, providerFilters, type TaskStatusFilter } from '../helpers/styles.js'

/** Maintains task monitor filters and returns the filtered task list. */
export const useTaskFilters = (tasks: readonly TaskRecord[]) => {
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('all')
  const [providerFilter, setProviderFilter] = useState<Provider | 'all'>('all')
  const [search, setSearch] = useState('')

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => (statusFilter === 'all' ? true : task.status === statusFilter))
      .filter((task) => (providerFilter === 'all' ? true : task.provider === providerFilter))
      .filter((task) => {
        if (search.trim().length === 0) {
          return true
        }

        const query = search.toLowerCase()
        return (
          task.id.toLowerCase().includes(query) ||
          task.provider.toLowerCase().includes(query) ||
          task.model.toLowerCase().includes(query) ||
          (task.outputText ?? '').toLowerCase().includes(query) ||
          (task.errorMessage ?? '').toLowerCase().includes(query)
        )
      })
  }, [tasks, statusFilter, providerFilter, search])

  const cycleStatus = (): void => {
    setStatusFilter((current) => cycle(listStatusFilters, current))
  }

  const cycleProvider = (): void => {
    setProviderFilter((current) => cycle(providerFilters, current))
  }

  return { statusFilter, providerFilter, search, filteredTasks, cycleStatus, cycleProvider, setSearch } as const
}
