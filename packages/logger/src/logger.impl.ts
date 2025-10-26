// standard
import path from 'node:path'

// 3rd-party
import { type Logger, pino, transport } from 'pino'

// local
import type { LoggerBuilderOptions, LoggerTransporter } from './logger.interface.js'

// -------------------------------------------------------------------------------------------------

/**
 * Builder class for creating and configuring Pino-based loggers.
 * Provides environment-specific logging configuration with support for multiple transport targets.
 * Uses singleton pattern to ensure consistent logger configuration across the application.
 */
export class LoggerBuilder {
  /** Singleton instance of the LoggerBuilder */
  private static instance?: LoggerBuilder
  /** The base logger instance created by the builder */
  private static baseLogger?: Logger

  /** Configuration options passed to the builder */
  private readonly options: LoggerBuilderOptions
  /** Array of configured transporters for the logger */
  private readonly transporters: LoggerTransporter[] = []
  /** The configured Pino logger instance */
  private readonly logger: Logger

  /**
   * Private constructor to enforce singleton pattern.
   * Configures the logger with appropriate transporters based on environment.
   *
   * @param options - Logger configuration options
   */
  private constructor(options: LoggerBuilderOptions) {
    this.options = options

    this.addBaseTransporters()
    if (this.options.env === 'production') {
      this.addProductionTransporters()
    } else {
      this.addDevelopmentTransporters()
    }
    this.addExtraTransporters()

    this.logger = pino({ level: this.options.logLevel }, transport({ targets: this.transporters }))
  }

  /**
   * Initializes the LoggerBuilder singleton with the provided configuration.
   * This method should be called once at application startup.
   *
   * @param options - Logger configuration options
   * @throws Error if LoggerBuilder is already initialized
   */
  public static init(options: LoggerBuilderOptions): void {
    if (LoggerBuilder.instance) {
      throw new Error('LoggerBuilder already initialized')
    }

    LoggerBuilder.instance = new LoggerBuilder(options)
    LoggerBuilder.baseLogger = LoggerBuilder.instance.logger
  }

  /**
   * Returns the configured logger instance.
   * LoggerBuilder must be initialized before calling this method.
   *
   * @returns The configured Pino logger instance
   * @throws Error if LoggerBuilder is not initialized
   */
  public static getLogger(): Logger {
    if (!LoggerBuilder.baseLogger) {
      throw new Error('LoggerBuilder not initialized. Call initialize() first.')
    }

    return LoggerBuilder.baseLogger
  }

  /**
   * Creates a child logger with additional context properties.
   * Child loggers inherit the parent's configuration but include extra properties in every log entry.
   *
   * @param properties - Additional properties to include in child logger
   * @returns A child logger with the specified properties
   */
  public static buildChildLogger(properties: Record<string, string>): Logger {
    return LoggerBuilder.getLogger().child(properties)
  }

  /**
   * Adds base transporters that are common across environments.
   * Currently adds file logging when logsDir is specified.
   */
  private addBaseTransporters() {
    if (this.options.logsDir) {
      this.transporters.push({
        level: 'trace',
        target: 'pino/file',
        options: {
          destination: path.join(this.options.logsDir, this.options.logFilename ?? 'lexy-logs.json'),
        },
      })
    }
  }

  /**
   * Adds extra transporters that are conditionally enabled based on environment.
   * Iterates through extraTransporters and adds those matching the current environment.
   */
  private addExtraTransporters() {
    for (const { env, transporter } of this.options.extraTransporters ?? []) {
      if (env === this.options.env) {
        this.transporters.push(transporter)
      }
    }
  }

  /**
   * Adds transporters specific to production environment.
   * Configures structured JSON logging to stdout.
   */
  private addProductionTransporters() {
    this.transporters.push({
      level: this.options.logLevel,
      target: 'pino/file',
      options: { destination: 1 },
    })
  }

  /**
   * Adds transporters specific to development environment.
   * Configures pretty-printed, colorized logging for better readability.
   */
  private addDevelopmentTransporters() {
    this.transporters.push({
      level: 'debug',
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'SYS:standard',
      },
    })
  }
}
