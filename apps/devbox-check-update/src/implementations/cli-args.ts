import { existsSync } from 'node:fs'
import path from 'node:path'

export interface DevboxCheckUpdateArgs {
  targetPath: string
  packages: string[]
  dryRun: boolean
  install: boolean
  allProjects: boolean
  syncLock: boolean
  environment?: string
  quiet: boolean
  help: boolean
}

export const HELP_TEXT = `devbox-check-update

Usage:
  devbox-check-update [devbox.json|dir] [packages...]

Examples:
  devbox-check-update
  devbox-check-update ./devbox.json --dry-run
  devbox-check-update ./project nodejs go
  devbox-check-update --install

Options:
  -d, --dry-run       Check changes in a temporary copy
  -i, --install       Run devbox update without --no-install
      --all-projects  Pass --all-projects to devbox update
      --sync-lock     Pass --sync-lock to devbox update
      --environment   Pass an environment name to devbox update
  -q, --quiet         Suppress logs from devbox update
  -h, --help          Prints this usage guide`

const readFlagValue = (argv: readonly string[], index: number, name: string): string => {
  const value = argv[index + 1]
  if (value === undefined || value.startsWith('-')) {
    throw new Error(`Missing value for ${name}`)
  }

  return value
}

const isLikelyPath = (value: string): boolean =>
  value === '.' ||
  value === '..' ||
  value.includes('/') ||
  value.endsWith('.json') ||
  value === 'devbox.json' ||
  value.startsWith('.') ||
  existsSync(path.resolve(value))

export const parseArgs = (argv: readonly string[] = process.argv.slice(2)): DevboxCheckUpdateArgs => {
  const positionals: string[] = []
  const args: DevboxCheckUpdateArgs = {
    targetPath: './devbox.json',
    packages: [],
    dryRun: false,
    install: false,
    allProjects: false,
    syncLock: false,
    quiet: false,
    help: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === undefined) {
      continue
    }

    if (token === '--') {
      positionals.push(...argv.slice(index + 1))
      break
    }

    if (token === '-h' || token === '--help') {
      args.help = true
      continue
    }

    if (token === '-d' || token === '--dry-run') {
      args.dryRun = true
      continue
    }

    if (token === '-i' || token === '--install') {
      args.install = true
      continue
    }

    if (token === '--all-projects') {
      args.allProjects = true
      continue
    }

    if (token === '--sync-lock') {
      args.syncLock = true
      continue
    }

    if (token === '-q' || token === '--quiet') {
      args.quiet = true
      continue
    }

    if (token === '--environment') {
      args.environment = readFlagValue(argv, index, token)
      index += 1
      continue
    }

    if (token.startsWith('--environment=')) {
      args.environment = token.slice('--environment='.length)
      continue
    }

    if (token.startsWith('-')) {
      throw new Error(`Unknown option: ${token}`)
    }

    positionals.push(token)
  }

  const [first, ...rest] = positionals
  if (first !== undefined && isLikelyPath(first)) {
    args.targetPath = first
    args.packages = rest
  } else if (first !== undefined) {
    args.packages = positionals
  }

  return args
}
