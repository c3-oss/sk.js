import type { Provider } from '../dtos/types.js'

export interface CommandConfig {
  readonly provider: Provider
  readonly model: string
  readonly autoApproval: boolean
  readonly cwd: string
}

export interface ProviderCommand {
  readonly command: string
  readonly args: readonly string[]
}

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
