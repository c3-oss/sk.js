import type { Provider, RunStatus, TaskStatus } from '../../dtos/types.js'

/** Date range filters available in run history. */
export type DateFilter = 'all' | 'today' | '7d' | '30d'
/** Task status filter option, including the unfiltered state. */
export type TaskStatusFilter = 'all' | TaskStatus
/** Run status filter option, including the unfiltered state. */
export type RunStatusFilter = 'all' | RunStatus

/** Task status filter cycle used by monitor screens. */
export const listStatusFilters: readonly TaskStatusFilter[] = [
  'all',
  'pending',
  'running',
  'success',
  'failed',
  'timeout',
]
/** Run status filter cycle used by run history. */
export const runStatusFilters: readonly RunStatusFilter[] = ['all', 'pending', 'running', 'completed', 'failed']
/** Date filter cycle used by run history. */
export const runDateFilters: readonly DateFilter[] = ['all', 'today', '7d', '30d']

/** Maps run and task statuses to Ink color names. */
export const getStatusColor = (status: TaskStatus | RunStatus): 'green' | 'yellow' | 'red' | 'gray' | 'cyan' => {
  if (status === 'success' || status === 'completed') {
    return 'green'
  }

  if (status === 'running' || status === 'pending') {
    return 'yellow'
  }

  if (status === 'failed' || status === 'timeout') {
    return 'red'
  }

  return 'gray'
}

/** Returns the next value in a finite filter cycle. */
export const cycle = <T>(values: readonly T[], current: T): T => {
  const index = values.indexOf(current)
  if (index < 0 || index === values.length - 1) {
    return values[0] as T
  }

  return values[index + 1] as T
}

/** Checks whether an ISO timestamp is inside a named run-history date range. */
export const byDateFilter = (createdAt: string, filter: DateFilter): boolean => {
  if (filter === 'all') {
    return true
  }

  const created = new Date(createdAt).getTime()
  const now = Date.now()
  if (Number.isNaN(created)) {
    return false
  }

  const diffMs = now - created
  if (filter === 'today') {
    return diffMs <= 24 * 60 * 60 * 1000
  }

  if (filter === '7d') {
    return diffMs <= 7 * 24 * 60 * 60 * 1000
  }

  return diffMs <= 30 * 24 * 60 * 60 * 1000
}

/** Provider filter cycle used by run and task lists. */
export const providerFilters: readonly (Provider | 'all')[] = ['all', 'claude', 'cursor-agent', 'gemini', 'codex']
