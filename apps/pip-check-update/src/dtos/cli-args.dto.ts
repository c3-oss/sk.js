export interface CLIArgs {
  /** Path to pyproject.toml file (positional argument). */
  pyprojectPath: string
  /** Only check, do not modify file. */
  dryRun: boolean
  /** Skip running sync/lock command after update. */
  skipLockSync: boolean
  /** Allow major version bumps. */
  breakMajor: boolean
  /** Show help. */
  help?: boolean
}
