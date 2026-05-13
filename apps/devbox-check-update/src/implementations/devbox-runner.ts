import { spawn } from 'node:child_process'

import type { DevboxCheckUpdateArgs } from './cli-args.js'

export interface CommandResult {
  output: string
  error?: string
}

export interface DevboxUpdateOptions {
  projectDir: string
  packages: readonly string[]
  install: boolean
  allProjects: boolean
  syncLock: boolean
  environment?: string
  quiet: boolean
}

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

export const toDevboxUpdateOptions = (args: DevboxCheckUpdateArgs, projectDir: string): DevboxUpdateOptions => ({
  projectDir,
  packages: args.packages,
  install: args.install,
  allProjects: args.allProjects,
  syncLock: args.syncLock,
  environment: args.environment,
  quiet: args.quiet,
})

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

export const runDevboxUpdate = async (options: DevboxUpdateOptions): Promise<CommandResult> => {
  const args = buildDevboxUpdateArgs(options)

  return runCommand('devbox', args, options.projectDir)
}
