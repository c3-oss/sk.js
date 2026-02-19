import type { ParsedArgv } from '../argv.js'
import { getLastFlagValue, getRegion, requireFlag } from '../argv.js'
import { extractEnvironment } from '../aws/extract.js'

export const runExtractCommand = async (parsed: ParsedArgv): Promise<void> => {
  const cluster = requireFlag(parsed, 'cluster')
  const service = requireFlag(parsed, 'service')
  const region = getRegion(parsed)
  const outputPath = getLastFlagValue(parsed, 'output') ?? '.env.sh'

  const extraction = await extractEnvironment({
    cluster,
    service,
    region,
    outputPath,
  })

  console.log(
    `Created ${extraction.outputPath} with ${extraction.envCount} environment variables and ${extraction.secretCount} secrets`,
  )
}
