import { PROVIDERS, type Provider } from '../dtos/types.js'

/** Default model used for each provider when callers do not override it. */
export const DEFAULT_MODELS: Record<Provider, string> = {
  claude: 'claude-opus-4-6',
  'cursor-agent': 'opus-4.6',
  gemini: 'gemini-2.5-pro',
  codex: 'gpt-5.3-codex',
}

/** Narrows arbitrary strings to supported provider identifiers. */
export const isProvider = (value: string): value is Provider => PROVIDERS.includes(value as Provider)
