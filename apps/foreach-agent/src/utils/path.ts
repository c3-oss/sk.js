import os from 'node:os'
import path from 'node:path'

export const FOREACH_AGENT_HOME = path.join(os.homedir(), '.foreach-agent')
export const TEMPLATES_DIR = path.join(FOREACH_AGENT_HOME, 'templates')
export const RUNS_DIR = path.join(FOREACH_AGENT_HOME, 'runs')
export const EXPORTS_DIR = path.join(FOREACH_AGENT_HOME, 'exports')

export const toSafeFileName = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'template'
