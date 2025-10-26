import { type Either, type Left, type Right, isLeft, isRight, left, right } from 'fp-ts/lib/Either.js'
export { type Option, type None, type Some, isSome, isNone, some, none } from 'fp-ts/lib/Option.js'

import { errorWrapper } from '@c3-oss/typeguard'

// ---------------------------------------------------------------------------------------------------------------------

/**
 * Re-exports core Either types and utilities from fp-ts.
 * Provides functional programming constructs for handling computations that may fail.
 */
export { left, right, isLeft, isRight, type Either }

/**
 * Represents an error with an associated string tag for categorization.
 * Useful for distinguishing between different types of errors in error handling.
 *
 * @template T - The tag type, must extend string (defaults to string)
 */
export interface ErrorTagged<T extends string = string> {
  /** The underlying error object */
  error: Error
  /** A string tag to categorize the error */
  tag: T
}

/**
 * Union type representing either a plain Error or a tagged error.
 */
export type ErrorValue = Error | ErrorTagged

/**
 * Represents a computation that can either succeed with value T or fail with an ErrorValue.
 * This is the most general error handling type in the functional utilities.
 *
 * @template T - The type of the successful result
 */
export type FailableValue<T> = Either<ErrorValue, T>

/**
 * Represents a computation that can either succeed with value T or fail with an Error.
 * A simplified version of FailableValue for cases where error tagging is not needed.
 *
 * @template T - The type of the successful result
 */
export type Failable<T> = Either<Error, T>

/**
 * Represents a computation that can either succeed with value V or fail with a tagged error of type T.
 * Provides type-safe error categorization while maintaining the Either structure.
 *
 * @template T - The error tag type (must extend string)
 * @template V - The type of the successful result
 */
export type FailableTagged<T extends string, V> = Either<ErrorTagged<T>, V>

// ---------------------------------------------------------------------------------------------------------------------

/**
 * Internal utility function that converts unknown values to Error objects.
 * Handles Error instances, strings, and other types by wrapping them appropriately.
 *
 * @param e - The value to convert to an Error
 * @returns An Error object
 */
const asError = (e: unknown) => (e instanceof Error ? e : typeof e === 'string' ? new Error(e) : errorWrapper(e))

/**
 * Creates a Left (error) Either from any value.
 * Automatically converts the input to an Error if it's not already one.
 *
 * @param e - The error value to wrap (will be converted to Error if needed)
 * @returns A Left Either containing the error
 */
export const err = (e: unknown) => left(asError(e))

/**
 * Creates a Left (error) Either with a tagged error.
 * Useful for categorizing errors with string tags for better error handling.
 *
 * @template T - The error tag type
 * @param tag - A string tag to categorize the error
 * @param e - The error value to wrap (will be converted to Error if needed)
 * @returns A Left Either containing the tagged error
 */
export const errT = <T extends string>(tag: T, e: unknown) => left({ error: asError(e), tag })

/**
 * Creates a Right (success) Either from any value.
 * Represents a successful computation result.
 *
 * @template T - The type of the successful value
 * @param t - The successful value to wrap
 * @returns A Right Either containing the value
 */
export const ok = <T>(t: T) => right(t)

/**
 * Extracts the value from a Right Either.
 * Unsafe operation - assumes the Either is Right. Use with caution.
 *
 * @template T - The type of the value
 * @param t - A Right Either
 * @returns The wrapped value
 */
export const val = <T>(t: Right<T>): T => t.right

/**
 * Type guard that checks if an Either represents a successful result (Right).
 *
 * @template T - The type of the potential successful value
 * @param t - The Either to check
 * @returns True if the Either is Right, false otherwise
 */
export const isOk = <T>(t: FailableValue<T>): t is Right<T> => isRight(t)

/**
 * Type guard that checks if an Either represents a failure (Left with ErrorValue).
 *
 * @template T - The type of the potential successful value
 * @param t - The Either to check
 * @returns True if the Either is Left, false otherwise
 */
export const isErr = <T>(t: FailableValue<T>): t is Left<ErrorValue> => isLeft(t)

/**
 * Extracts the value from an Either, with optional fallback.
 * If the Either is Left and no fallback is provided, throws the error.
 *
 * @template T - The type of the value
 * @param t - The Either to unwrap
 * @param fallback - Optional fallback value to return if the Either is Left
 * @returns The wrapped value if Right, fallback if provided and Left, throws error otherwise
 * @throws The error contained in the Left Either if no fallback is provided
 */
export const unwrap = <T>(t: FailableValue<T>, fallback?: T): T => {
  if (isOk(t)) {
    return t.right
  }
  if (fallback) {
    return fallback
  }
  throw t.left
}
