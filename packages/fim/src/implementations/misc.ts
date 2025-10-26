// standard
import util from 'node:util'

type GenericFunc<T> = (arg: T) => T

export const errorWrapper = (e: unknown): Error => {
  if (e instanceof Error) {
    return e
  }

  if (typeof e === 'string') {
    return new Error(e)
  }

  return new Error(util.inspect(e))
}

export const flow = <T>(...fns: Array<GenericFunc<T>>): GenericFunc<T> => fns.reduce((f, g) => (x) => g(f(x)))
