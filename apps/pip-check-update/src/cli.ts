#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

import chalk from 'chalk'

import { helpCommand, parseArgs } from './implementations/cli-args.js'
import { errorWrapper } from './implementations/misc.js'
import { fetchMultiplePackages } from './implementations/pypi-client.js'
import { parsePyProject } from './implementations/pyproject-parser.js'
import { runSyncCommand, updatePyProjectFile } from './implementations/updater.js'
import { analyzeUpdate, formatUpdateTable } from './implementations/version-utils.js'

const die = (error: unknown): never => {
  const { message } = errorWrapper(typeof error === 'string' ? new Error(error) : error)

  console.error(message)
  console.error("Use '%s --help' to see the manual", helpCommand)
  process.exit(1)
}

const bye = (message?: string): never => {
  if (message !== undefined) {
    console.log(message)
  }

  process.exit(0)
}

/**
 * Runs the pip-check-update CLI using process arguments and exits when the update workflow finishes.
 */
export const main = async (): Promise<void> => {
  const { pyprojectPath, dryRun, skipLockSync, breakMajor } = parseArgs()

  if (!pyprojectPath) {
    return die('Please provide a path to pyproject.toml')
  }

  const resolvedPath = path.resolve(pyprojectPath)
  try {
    await fs.access(resolvedPath)
  } catch {
    return die(`File not found: ${resolvedPath}`)
  }

  console.log(chalk.cyan('Parsing pyproject.toml...'))
  const pyproject = await parsePyProject(resolvedPath)
  console.log(chalk.gray(`Detected format: ${pyproject.format}`))
  console.log(chalk.gray(`Detected manager: ${pyproject.manager}`))
  console.log(chalk.gray(`Found ${pyproject.dependencies.length} dependencies`))

  if (pyproject.dependencies.length === 0) {
    return bye('No dependencies found to check.')
  }

  console.log(chalk.cyan('\nFetching latest versions from PyPI...'))
  const packageNames = pyproject.dependencies.map((dependency) => dependency.name)
  const pypiResults = await fetchMultiplePackages(packageNames)

  const updates = pyproject.dependencies.map((dependency) =>
    analyzeUpdate(dependency, pypiResults.get(dependency.name) ?? null, pyproject.format, breakMajor),
  )

  console.log(formatUpdateTable(updates))

  const updatesToApply = updates.filter((update) => update.shouldUpdate)
  const skippedMajorUpdates = updates.filter((update) => update.isMajorBump && !update.shouldUpdate)

  if (updatesToApply.length === 0) {
    if (skippedMajorUpdates.length > 0) {
      console.log(
        chalk.yellow(`${skippedMajorUpdates.length} major updates available. Use --break-major to include them.`),
      )
    }

    return bye(chalk.green('\nAll dependencies are up to date!'))
  }

  if (dryRun) {
    console.log(chalk.yellow(`\nDry run: ${updatesToApply.length} packages would be updated.`))

    return bye()
  }

  console.log(chalk.cyan(`\nUpdating ${updatesToApply.length} packages...`))
  const updatedCount = await updatePyProjectFile(pyproject, updates)
  console.log(chalk.green(`Updated ${updatedCount} packages in ${pyprojectPath}`))

  if (!skipLockSync) {
    const command = pyproject.manager === 'poetry' ? 'poetry lock' : 'uv sync'
    console.log(chalk.cyan(`\nRunning ${command}...`))

    const { output, error } = await runSyncCommand(resolvedPath, pyproject.manager)
    if (error !== undefined) {
      console.log(chalk.red(`Warning: ${command} failed:`))
      console.log(chalk.red(error))
    } else if (output.length > 0) {
      console.log(chalk.gray(output))
    }
  }

  return bye(chalk.green('\nDone!'))
}

void main().catch((error) => die(error))
