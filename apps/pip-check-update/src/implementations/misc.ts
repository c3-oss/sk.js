import util from 'node:util'

export const errorWrapper = (error: unknown): Error => {
  if (error instanceof Error) {
    return error
  }

  if (typeof error === 'string') {
    return new Error(error)
  }

  return new Error(util.inspect(error))
}
