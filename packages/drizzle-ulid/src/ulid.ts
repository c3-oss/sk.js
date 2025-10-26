import { customType } from 'drizzle-orm/pg-core'
import { ulid } from 'ulidx'

/**
 * Custom Drizzle type for ULID (Universally Unique Lexicographically Sortable Identifier).
 * ULIDs are 128-bit identifiers that are URL-safe and lexicographically sortable.
 * This type maps to a PostgreSQL VARCHAR(32) column.
 */
export const ulidType = customType<{ data: string }>({
  dataType() {
    return 'varchar(32)'
  },
  toDriver(value: string): string {
    return value
  },
})

/**
 * Creates a unique key column with ULID type and automatic generation.
 * The column will be non-nullable, unique, and will auto-generate ULID values
 * using the ulidx library when no value is provided.
 *
 * @param name - The column name in the database
 * @returns A Drizzle column definition for a unique ULID key
 */
export function ulidUniqueKey(name: string) {
  return ulidType(name)
    .notNull()
    .unique()
    .$defaultFn(() => ulid())
}
