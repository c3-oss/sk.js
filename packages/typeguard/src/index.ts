import type { Nullish } from '@c3-oss/types'

export type AnythingButNull<T> = T extends null ? undefined : T

export const nonNull = <T>(value: Nullish<T>) => (value === null ? undefined : value) as AnythingButNull<T>
