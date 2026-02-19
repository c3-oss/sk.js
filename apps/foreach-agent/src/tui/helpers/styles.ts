import type { Provider, RunStatus, TaskStatus } from '../../dtos/types.js'

export type DateFilter = 'all' | 'today' | '7d' | '30d'
export type TaskStatusFilter = 'all' | TaskStatus
export type RunStatusFilter = 'all' | RunStatus

export const listStatusFilters: readonly TaskStatusFilter[] = [
  'all',
  'pending',
  'running',
  'success',
  'failed',
  'timeout',
]
export const runStatusFilters: readonly RunStatusFilter[] = ['all', 'pending', 'running', 'completed', 'failed']
export const runDateFilters: readonly DateFilter[] = ['all', 'today', '7d', '30d']

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

export const cycle = <T>(values: readonly T[], current: T): T => {
  const index = values.indexOf(current)
  if (index < 0 || index === values.length - 1) {
    return values[0] as T
  }

  return values[index + 1] as T
}

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

export const providerFilters: readonly (Provider | 'all')[] = ['all', 'claude', 'cursor-agent', 'gemini', 'codex']
