import { useMemo, useState } from 'react'

import type { Provider, RunSummary } from '../../dtos/types.js'
import {
  type DateFilter,
  type RunStatusFilter,
  byDateFilter,
  cycle,
  providerFilters,
  runDateFilters,
  runStatusFilters,
} from '../helpers/styles.js'

/** Maintains run-history filters and returns the filtered run list. */
export const useRunFilters = (runs: readonly RunSummary[]) => {
  const [statusFilter, setStatusFilter] = useState<RunStatusFilter>('all')
  const [providerFilter, setProviderFilter] = useState<Provider | 'all'>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [search, setSearch] = useState('')

  const filteredRuns = useMemo(() => {
    return runs
      .filter((run) => (statusFilter === 'all' ? true : run.status === statusFilter))
      .filter((run) => (providerFilter === 'all' ? true : run.providers.includes(providerFilter)))
      .filter((run) => byDateFilter(run.createdAt, dateFilter))
      .filter((run) => {
        if (search.trim().length === 0) {
          return true
        }

        const query = search.toLowerCase()
        return (
          run.id.toLowerCase().includes(query) ||
          run.templateName.toLowerCase().includes(query) ||
          run.providers.join(',').toLowerCase().includes(query)
        )
      })
  }, [runs, statusFilter, providerFilter, dateFilter, search])

  const cycleStatus = (): void => {
    setStatusFilter((current) => cycle(runStatusFilters, current))
  }

  const cycleProvider = (): void => {
    setProviderFilter((current) => cycle(providerFilters, current))
  }

  const cycleDate = (): void => {
    setDateFilter((current) => cycle(runDateFilters, current))
  }

  return {
    statusFilter,
    providerFilter,
    dateFilter,
    search,
    filteredRuns,
    cycleStatus,
    cycleProvider,
    cycleDate,
    setSearch,
  } as const
}
