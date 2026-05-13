import os from 'node:os'
import path from 'node:path'

/** Root directory for foreach-agent user data. */
export const FOREACH_AGENT_HOME = path.join(os.homedir(), '.foreach-agent')
/** Directory where Liquid templates are stored. */
export const TEMPLATES_DIR = path.join(FOREACH_AGENT_HOME, 'templates')
/** Directory where run records, prompts, and transcripts are stored. */
export const RUNS_DIR = path.join(FOREACH_AGENT_HOME, 'runs')
/** Directory used for default export paths. */
export const EXPORTS_DIR = path.join(FOREACH_AGENT_HOME, 'exports')

/** Converts user-provided template names into safe file names. */
export const toSafeFileName = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'template'
