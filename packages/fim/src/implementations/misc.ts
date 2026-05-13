// standard
import util from 'node:util'

/**
 * Unary transformation used by the local formatter pipeline.
 */
type GenericFunc<T> = (arg: T) => T

/**
 * Converts thrown or reported values into `Error` instances for CLI output.
 *
 * @param e - Unknown error-like value to normalize.
 * @returns An `Error` with a printable message.
 */
export const errorWrapper = (e: unknown): Error => {
  if (e instanceof Error) {
    return e
  }

  if (typeof e === 'string') {
    return new Error(e)
  }

  return new Error(util.inspect(e))
}

/**
 * Composes unary transformations from left to right.
 *
 * @param fns - Transformations to apply in sequence.
 * @returns A function that passes a value through every transformation.
 */
export const flow = <T>(...fns: Array<GenericFunc<T>>): GenericFunc<T> => fns.reduce((f, g) => (x) => g(f(x)))
