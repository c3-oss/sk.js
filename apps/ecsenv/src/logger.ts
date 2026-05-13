import { type Logger, LoggerBuilder } from '@c3-oss/logger'

LoggerBuilder.init({
  env: (process.env.NODE_ENV as 'development' | 'production') ?? 'development',
  logLevel: 'info',
})

/**
 * Shared ecsenv logger configured for CLI output.
 */
export const log: Logger = LoggerBuilder.getLogger()
