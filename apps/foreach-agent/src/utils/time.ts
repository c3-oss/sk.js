export const nowIso = (): string => new Date().toISOString()

export const durationMs = (startIso?: string, endIso?: string): number | undefined => {
  if (startIso === undefined || endIso === undefined) {
    return undefined
  }

  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return undefined
  }

  return Math.max(0, end - start)
}

export const formatDuration = (valueMs?: number): string => {
  if (valueMs === undefined) {
    return '-'
  }

  if (valueMs < 1000) {
    return `${valueMs}ms`
  }

  const totalSeconds = Math.floor(valueMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes === 0) {
    return `${seconds}s`
  }

  return `${minutes}m ${seconds}s`
}
