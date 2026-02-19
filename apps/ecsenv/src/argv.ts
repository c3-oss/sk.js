export interface ParsedArgv {
  readonly positionals: readonly string[]
  readonly flags: ReadonlyMap<string, readonly string[]>
}

export const parseArgv = (argv: readonly string[]): ParsedArgv => {
  const positionals: string[] = []
  const flags = new Map<string, string[]>()

  const pushFlag = (name: string, value: string): void => {
    const previous = flags.get(name) ?? []
    previous.push(value)
    flags.set(name, previous)
  }

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

export const hasFlag = (parsed: ParsedArgv, name: string): boolean => parsed.flags.has(name)

export const getFlagValues = (parsed: ParsedArgv, name: string): readonly string[] => parsed.flags.get(name) ?? []

export const getLastFlagValue = (parsed: ParsedArgv, name: string): string | undefined =>
  getFlagValues(parsed, name).at(-1)

export const requireFlag = (parsed: ParsedArgv, name: string): string => {
  const value = getLastFlagValue(parsed, name)
  if (!value || value === 'true') {
    throw new Error(`missing required flag --${name}`)
  }
  return value
}

export const getRegion = (parsed: ParsedArgv): string =>
  getLastFlagValue(parsed, 'region') ?? process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1'
