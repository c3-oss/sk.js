import { hasFlag, type ParsedArgv, parseArgv } from './argv.js'
import { runClustersCommand } from './commands/clusters.js'
import { runExtractCommand } from './commands/extract.js'
import { runServicesCommand } from './commands/services.js'
import { runInteractiveCommand } from './commands/tui.js'

type CommandName = 'tui' | 'clusters' | 'services' | 'extract'

const HELP_TEXT = `ecsenv

Usage:
  ecsenv                                              Open interactive TUI (Ink)
  ecsenv tui                                          Open interactive TUI (Ink)
  ecsenv clusters [--region us-east-1] [--output-format table|json]
  ecsenv services --cluster <name|arn> [--region us-east-1] [--output-format table|json]
  ecsenv extract --cluster <name|arn> --service <name|arn> [--region us-east-1] [--output .env.sh]

Common flags:
  --region <aws-region>                               Defaults to AWS_REGION, AWS_DEFAULT_REGION or us-east-1
  --output-format table|json                          For list commands (clusters/services)
  --output <path>                                     For extract command, defaults to .env.sh
  -h, --help                                          Show this help

Examples:
  ecsenv clusters --region us-east-1
  ecsenv services --cluster MZ-ECS-STG-01 --output-format json
  ecsenv extract --cluster MZ-ECS-STG-01 --service api --output .env.sh`

/**
 * Resolves the command to run from positional arguments and implicit extract flags.
 */
const resolveCommand = (parsed: ParsedArgv): CommandName => {
  const implicitExtract = parsed.positionals.length === 0 && hasFlag(parsed, 'cluster') && hasFlag(parsed, 'service')
  if (implicitExtract) {
    return 'extract'
  }

  const command = (parsed.positionals[0] ?? 'tui').toLowerCase()
  if (command === 'tui' || command === 'clusters' || command === 'services' || command === 'extract') {
    return command
  }
  throw new Error(`unknown command "${command}". Use --help to see usage`)
}

/**
 * Runs the ecsenv CLI with parsed arguments and dispatches to the selected command.
 */
export const main = async (argv: readonly string[] = process.argv.slice(2)): Promise<void> => {
  const parsed = parseArgv(argv)
  if (hasFlag(parsed, 'help') || parsed.positionals[0] === 'help') {
    console.log(HELP_TEXT)
    return
  }

  const command = resolveCommand(parsed)
  if (command === 'tui') {
    await runInteractiveCommand(parsed)
    return
  }

  if (command === 'clusters') {
    await runClustersCommand(parsed)
    return
  }

  if (command === 'services') {
    await runServicesCommand(parsed)
    return
  }

  await runExtractCommand(parsed)
}
