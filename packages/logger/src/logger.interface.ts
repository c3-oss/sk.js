// c3
import type { LogLevel, NodeEnv } from '@c3-oss/magic-values'

// -------------------------------------------------------------------------------------------------

/** Re-exports the Logger type from pino for external use */
export type { Logger } from 'pino'

/**
 * Configuration for a single logger transport target.
 * Defines where and how logs should be written (file, console, etc.).
 */
export interface LoggerTransporter {
  /** Minimum log level this transport will handle */
  level: LogLevel
  /** Pino transport target (e.g., 'pino/file', 'pino-pretty') */
  target: string
  /** Transport-specific configuration options */
  options: Record<string, unknown>
}

/**
 * Configuration for an extra transporter that can be conditionally added based on environment.
 * Useful for adding development-only or production-only logging targets.
 */
export interface LoggerExtraTransporter {
  /** Environment in which this transporter should be active */
  env: NodeEnv
  /** The transporter configuration */
  transporter: LoggerTransporter
}

/**
 * Configuration options for building and configuring the logger.
 * Defines the logging behavior across different environments and use cases.
 */
export interface LoggerBuilderOptions {
  /** Current environment (development, production, etc.) */
  env: NodeEnv
  /** Minimum log level for the logger */
  logLevel: LogLevel
  /** Directory where log files should be written (optional) */
  logsDir?: string
  /** Custom filename for log files (defaults to 'lexy-logs.json') */
  logFilename?: string
  /** Additional transporters to add conditionally based on environment */
  extraTransporters?: LoggerExtraTransporter[]
}
