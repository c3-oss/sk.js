/**
 * A value that may be absent but is not explicitly `null`.
 */
export type Optional<T> = T | undefined

/**
 * A value that may be explicitly `null`.
 */
export type Nullable<T> = T | null

/**
 * A value that may be either `null` or `undefined`.
 */
export type Nullish<T> = Optional<Nullable<T>>
