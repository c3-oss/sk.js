import type { Provider } from '../dtos/types.js'

/** Provider process options resolved for one task attempt. */
export interface CommandConfig {
  /** Provider CLI to invoke. */
  readonly provider: Provider
  /** Model name passed to the provider CLI. */
  readonly model: string
  /** Whether to request unattended approval behavior from the provider. */
  readonly autoApproval: boolean
  /** Working directory used by providers that need it in arguments. */
  readonly cwd: string
}

/** Concrete executable and arguments used to launch a provider CLI. */
export interface ProviderCommand {
  /** Binary name expected on PATH. */
  readonly command: string
  /** Arguments passed without shell interpolation. */
  readonly args: readonly string[]
}

/** Builds the provider-specific command line for one task attempt. */
export const buildProviderCommand = ({ provider, model, autoApproval, cwd }: CommandConfig): ProviderCommand => {
  switch (provider) {
    case 'claude': {
      const args = [
        '-p',
        '--verbose',
        '--output-format',
        'stream-json',
        '--model',
        model,
        '--permission-mode',
        autoApproval ? 'bypassPermissions' : 'default',
      ]
      return { command: 'claude', args }
    }

    case 'cursor-agent': {
      const args = [
        '--print',
        '--output-format',
        'stream-json',
        '--model',
        model,
        '--trust',
        ...(autoApproval ? ['--force'] : []),
      ]
      return { command: 'cursor-agent', args }
    }

    case 'gemini': {
      const args = [
        '--prompt',
        ' ',
        '--output-format',
        'stream-json',
        '--model',
        model,
        ...(autoApproval ? ['--yolo'] : ['--approval-mode', 'default']),
      ]
      return { command: 'gemini', args }
    }

    case 'codex': {
      const args = [
        'exec',
        '--json',
        '--skip-git-repo-check',
        '-C',
        cwd,
        '-m',
        model,
        '-a',
        'never',
        '--sandbox',
        autoApproval ? 'danger-full-access' : 'workspace-write',
      ]
      return { command: 'codex', args }
    }

    default:
      return { command: provider, args: [] }
  }
}
