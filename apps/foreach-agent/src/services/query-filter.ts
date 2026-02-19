import { compileExpression } from 'filtrex'

type QueryPredicate<TContext extends Record<string, unknown>> = (context: TContext) => unknown

const normalizeQuery = (query: string): string =>
  query
    .split('\n')
    .map((line) => line.trim())
    .join(' ')
    .trim()

const isTruthyQueryResult = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value !== 0
  }

  if (typeof value === 'string') {
    return value.length > 0
  }

  return value !== null && value !== undefined
}

const compileQueryPredicate = <TContext extends Record<string, unknown>>(query: string): QueryPredicate<TContext> => {
  try {
    return compileExpression(query) as QueryPredicate<TContext>
  } catch (errorValue) {
    const reason = errorValue instanceof Error ? errorValue.message : String(errorValue)
    throw new Error(`invalid query: ${reason}`)
  }
}

export const filterWithQuery = <TContext extends Record<string, unknown>, TItem>(
  items: readonly TItem[],
  query: string,
  mapContext: (item: TItem) => TContext,
  mapLabel: (item: TItem) => string,
): readonly TItem[] => {
  const normalizedQuery = normalizeQuery(query)
  if (normalizedQuery.length === 0) {
    return items
  }

  const predicate = compileQueryPredicate<TContext>(normalizedQuery)

  return items.filter((item) => {
    const context = mapContext(item)
    const result = predicate(context)

    if (result instanceof Error) {
      throw new Error(`query evaluation failed for ${mapLabel(item)}: ${result.message}`)
    }

    return isTruthyQueryResult(result)
  })
}
