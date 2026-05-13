#!/usr/bin/env node

import chalk from 'chalk'

import { HELP_TEXT, parseArgs } from './implementations/cli-args.js'
import { readDevboxProject } from './implementations/devbox-config.js'
import { runDevboxUpdate, toDevboxUpdateOptions } from './implementations/devbox-runner.js'
import { runDryDevboxUpdate } from './implementations/dry-run.js'

const die = (error: unknown): never => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  console.error("Use 'npx devbox-check-update --help' to see the manual")
  process.exit(1)
}

const bye = (message?: string): never => {
  if (message !== undefined) {
    console.log(message)
  }

  process.exit(0)
}

/**
 * Runs the devbox-check-update CLI using process arguments and exits after completing the requested update mode.
 */
export const main = async (): Promise<void> => {
  const args = parseArgs()

  if (args.help) {
    return bye(HELP_TEXT)
  }

  const project = await readDevboxProject(args.targetPath)
  const updateOptions = toDevboxUpdateOptions(args, project.projectDir)

  console.log(chalk.cyan(`Updating Devbox project: ${project.configPath}`))
  if (args.packages.length > 0) {
    console.log(chalk.gray(`Packages: ${args.packages.join(', ')}`))
  }

  if (args.dryRun) {
    const result = await runDryDevboxUpdate(project.projectDir, updateOptions)

    if (result.error !== undefined) {
      return die(result.error)
    }

    if (result.output.length > 0) {
      console.log(chalk.gray(result.output))
    }

    if (result.changedFiles.length === 0) {
      return bye(chalk.green('No Devbox updates available.'))
    }

    return bye(chalk.yellow(`Dry run: ${result.changedFiles.join(', ')} would change.`))
  }

  const result = await runDevboxUpdate(updateOptions)
  if (result.error !== undefined) {
    return die(result.error)
  }

  if (result.output.length > 0) {
    console.log(chalk.gray(result.output))
  }

  return bye(chalk.green(args.install ? 'Devbox packages updated.' : 'Devbox lockfile updated without install.'))
}

void main().catch((error) => die(error))
