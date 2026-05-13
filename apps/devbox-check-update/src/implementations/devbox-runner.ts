import { spawn } from 'node:child_process'

import type { DevboxCheckUpdateArgs } from './cli-args.js'

/**
 * Captured stdout and optional failure text from a subprocess.
 */
export interface CommandResult {
  /** Standard output emitted by the command. */
  output: string
  /** Error message or stderr output when the command fails. */
  error?: string
}

/**
 * Normalized options used to invoke `devbox update`.
 */
export interface DevboxUpdateOptions {
  /** Directory containing the target Devbox project. */
  projectDir: string
  /** Optional package names to update. */
  packages: readonly string[]
  /** Whether Devbox may install packages after updating metadata. */
  install: boolean
  /** Whether to update all Devbox projects. */
  allProjects: boolean
  /** Whether to synchronize the lockfile. */
  syncLock: boolean
  /** Optional Devbox environment name. */
  environment?: string
  /** Whether to suppress Devbox output. */
  quiet: boolean
}

/**
 * Builds the argument vector passed to `devbox update`.
 */
export const buildDevboxUpdateArgs = (options: DevboxUpdateOptions): string[] => {
  const args = ['update', '--config', options.projectDir]

  if (!options.install) {
    args.push('--no-install')
  }

  if (options.allProjects) {
    args.push('--all-projects')
  }

  if (options.syncLock) {
    args.push('--sync-lock')
  }

  if (options.environment !== undefined) {
    args.push('--environment', options.environment)
  }

  if (options.quiet) {
    args.push('--quiet')
  }

  args.push(...options.packages)

  return args
}

/**
 * Converts parsed CLI arguments into runner options for a resolved project directory.
 */
export const toDevboxUpdateOptions = (args: DevboxCheckUpdateArgs, projectDir: string): DevboxUpdateOptions => ({
  projectDir,
  packages: args.packages,
  install: args.install,
  allProjects: args.allProjects,
  syncLock: args.syncLock,
  environment: args.environment,
  quiet: args.quiet,
})

/**
 * Runs a command in a working directory and captures stdout and failure text.
 */
export const runCommand = (command: string, args: readonly string[], cwd: string): Promise<CommandResult> =>
  new Promise((resolve) => {
    const childProcess = spawn(command, args, { cwd })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []

    childProcess.stdout.on('data', (chunk: Buffer) => stdout.push(chunk))
    childProcess.stderr.on('data', (chunk: Buffer) => stderr.push(chunk))
    childProcess.on('error', (error) => resolve({ output: '', error: error.message }))
    childProcess.on('close', (code) => {
      const output = Buffer.concat(stdout).toString('utf-8')
      const errorOutput = Buffer.concat(stderr).toString('utf-8')

      if (code !== 0) {
        resolve({ output, error: errorOutput || `devbox exited with code ${code}` })
        return
      }

      resolve({ output })
    })
  })

/**
 * Executes `devbox update` with normalized options.
 */
export const runDevboxUpdate = async (options: DevboxUpdateOptions): Promise<CommandResult> => {
  const args = buildDevboxUpdateArgs(options)

  return runCommand('devbox', args, options.projectDir)
}
