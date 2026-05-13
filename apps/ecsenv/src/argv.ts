/**
 * Parsed command-line arguments split into positionals and repeatable flags.
 */
export interface ParsedArgv {
  /** Positional arguments in the order they were provided. */
  readonly positionals: readonly string[]
  /** Flag values keyed by flag name without leading dashes. */
  readonly flags: ReadonlyMap<string, readonly string[]>
}

/**
 * Parses command-line tokens into positionals and long-form flag values.
 */
export const parseArgv = (argv: readonly string[]): ParsedArgv => {
  const positionals: string[] = []
  const flags = new Map<string, string[]>()

  /**
   * Appends a value to a repeatable flag.
   */
  const pushFlag = (name: string, value: string): void => {
    const previous = flags.get(name) ?? []
    previous.push(value)
    flags.set(name, previous)
  }

  /**
   * Determines whether a token can be consumed as the value for the previous flag.
   */
  const isValueToken = (value: string | undefined): value is string => {
    if (value === undefined || value === '--') {
      return false
    }

    if (value.startsWith('--')) {
      return false
    }

    if (value.startsWith('-') && !/^-\d+(\.\d+)?$/.test(value)) {
      return false
    }

    return true
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

    if (token === '-h') {
      pushFlag('help', 'true')
      continue
    }

    if (!token.startsWith('--')) {
      positionals.push(token)
      continue
    }

    const flagToken = token.slice(2)
    const equalsIndex = flagToken.indexOf('=')
    if (equalsIndex >= 0) {
      const name = flagToken.slice(0, equalsIndex)
      const value = flagToken.slice(equalsIndex + 1)
      pushFlag(name, value)
      continue
    }

    const nextToken = argv[index + 1]
    if (isValueToken(nextToken)) {
      pushFlag(flagToken, nextToken)
      index += 1
      continue
    }

    pushFlag(flagToken, 'true')
  }

  return { positionals, flags }
}

/**
 * Checks whether a flag was provided at least once.
 */
export const hasFlag = (parsed: ParsedArgv, name: string): boolean => parsed.flags.has(name)

/**
 * Returns all values provided for a repeatable flag.
 */
export const getFlagValues = (parsed: ParsedArgv, name: string): readonly string[] => parsed.flags.get(name) ?? []

/**
 * Returns the final value provided for a flag.
 */
export const getLastFlagValue = (parsed: ParsedArgv, name: string): string | undefined =>
  getFlagValues(parsed, name).at(-1)

/**
 * Reads a required flag value and rejects boolean-style flags.
 */
export const requireFlag = (parsed: ParsedArgv, name: string): string => {
  const value = getLastFlagValue(parsed, name)
  if (!value || value === 'true') {
    throw new Error(`missing required flag --${name}`)
  }
  return value
}

/**
 * Resolves the AWS region from CLI flags, environment variables, or the default region.
 */
export const getRegion = (parsed: ParsedArgv): string =>
  getLastFlagValue(parsed, 'region') ?? process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1'
