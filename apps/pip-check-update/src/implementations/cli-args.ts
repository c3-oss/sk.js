import util from 'node:util'

import { parse as parseCli } from 'ts-command-line-args'

import type { CLIArgs } from '../dtos/cli-args.dto.js'

const PROGRAM_COMMAND = 'npx pip-check-update'

interface RawCLIArgs {
  'pyproject-path': string
  'dry-run': boolean
  'skip-lock-sync': boolean
  'break-major': boolean
  help?: boolean
}

export const parseArgs = (): CLIArgs => {
  const raw = parseCli<RawCLIArgs>(
    {
      'pyproject-path': {
        type: String,
        defaultOption: true,
        description: 'Path to pyproject.toml file',
      },
      'dry-run': {
        type: Boolean,
        alias: 'd',
        description: 'Only check, do not modify file',
        defaultValue: false,
      },
      'skip-lock-sync': {
        type: Boolean,
        alias: 's',
        description: 'Skip running uv sync / poetry lock after update',
        defaultValue: false,
      },
      'break-major': {
        type: Boolean,
        alias: 'b',
        description: 'Allow major version bumps',
        defaultValue: false,
      },
      help: {
        type: Boolean,
        optional: true,
        alias: 'h',
        description: 'Prints this usage guide',
      },
    },
    {
      helpArg: 'help',
      headerContentSections: [
        {
          header: 'Description',
          content: 'pip-check-update - Check and update Python dependencies in pyproject.toml',
        },
        {
          header: 'Examples',
          content: [
            '$ %s ./pyproject.toml',
            '$ %s /path/to/pyproject.toml --dry-run',
            '$ %s pyproject.toml --break-major',
            '$ %s pyproject.toml --skip-lock-sync',
          ].map((example) => util.format(example, PROGRAM_COMMAND)),
        },
      ],
    },
  )

  return {
    pyprojectPath: raw['pyproject-path'],
    dryRun: raw['dry-run'],
    skipLockSync: raw['skip-lock-sync'],
    breakMajor: raw['break-major'],
    help: raw.help,
  }
}

export const helpCommand = PROGRAM_COMMAND
