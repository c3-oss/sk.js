import type { Nullish } from '@c3-oss/types'

/**
 * Replaces `null` with `undefined` while preserving all other value types.
 */
export type AnythingButNull<T> = T extends null ? undefined : T

/**
 * Normalizes a nullable value so callers only need to handle `undefined`.
 *
 * @param value - The value that may be `null` or `undefined`.
 * @returns `undefined` when the value is `null`; otherwise the original value.
 */
export const nonNull = <T>(value: Nullish<T>) => (value === null ? undefined : value) as AnythingButNull<T>

/**
 * Converts any thrown value into an `Error` instance.
 *
 * Objects are serialized as JSON when possible, while primitive values are
 * stringified with `String`.
 *
 * @param error - The unknown error-like value to normalize.
 * @returns An `Error` that can be logged, thrown, or returned consistently.
 */
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
