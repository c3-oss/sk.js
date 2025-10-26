// 3rd-party
import z from 'zod'

// -------------------------------------------------------------------------------------------------

/**
 * Zod schema for validating log levels.
 * Defines the standard logging levels used across the application.
 * These levels follow common logging conventions and are ordered by verbosity.
 */
export const logLevelSchema = z.enum(['trace', 'debug', 'info', 'warn', 'error'])

/**
 * Zod schema for validating Node.js environment values.
 * Defines the standard environment names used for application configuration.
 * These environments represent different deployment contexts.
 */
export const nodeEnvSchema = z.enum(['development', 'production', 'test', 'staging', 'local'])

// -------------------------------------------------------------------------------------------------

/**
 * Type representing valid log levels.
 * Extracted from the logLevelSchema for use in TypeScript type annotations.
 * Values: 'trace' | 'debug' | 'info' | 'warn' | 'error'
 */
export type LogLevel = z.infer<typeof logLevelSchema>

/**
 * Type representing valid Node.js environment values.
 * Extracted from the nodeEnvSchema for use in TypeScript type annotations.
 * Values: 'development' | 'production' | 'test' | 'staging' | 'local'
 */
export type NodeEnv = z.infer<typeof nodeEnvSchema>
