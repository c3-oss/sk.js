import type { Nullish } from '@c3-oss/types'

export type AnythingButNull<T> = T extends null ? undefined : T

export const nonNull = <T>(value: Nullish<T>) => (value === null ? undefined : value) as AnythingButNull<T>

export const errorWrapper = (error: unknown): Error => {
  if (error instanceof Error) {
    return error
  }

  if (typeof error === 'object' && error !== null) {
    try {
      return new Error(JSON.stringify(error))
    } catch {
      return new Error('non-serializable error')
    }
  }

  return new Error(String(error))
}
