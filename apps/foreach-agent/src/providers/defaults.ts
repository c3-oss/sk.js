import { PROVIDERS, type Provider } from '../dtos/types.js'

export const DEFAULT_MODELS: Record<Provider, string> = {
  claude: 'claude-opus-4-6',
  'cursor-agent': 'opus-4.6',
  gemini: 'gemini-2.5-pro',
  codex: 'gpt-5.3-codex',
}

export const isProvider = (value: string): value is Provider => PROVIDERS.includes(value as Provider)
