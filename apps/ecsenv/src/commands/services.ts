import type { ParsedArgv } from '../argv.js'
import { getLastFlagValue, getRegion, requireFlag } from '../argv.js'
import { listServices } from '../aws/services.js'
import type { ServiceRecord } from '../aws/services.js'
import { parseListOutputFormat, printRows } from '../table.js'

const toServicesRows = (services: readonly ServiceRecord[]): readonly Record<string, unknown>[] =>
  services.map((service) => ({
    name: service.name,
    arn: service.arn,
  }))

export const runServicesCommand = async (parsed: ParsedArgv): Promise<void> => {
  const cluster = requireFlag(parsed, 'cluster')
  const region = getRegion(parsed)
  const outputFormat = parseListOutputFormat(getLastFlagValue(parsed, 'output-format'))
  const services = await listServices(region, cluster)

  printRows(toServicesRows(services), outputFormat, {
    region,
    cluster,
    count: services.length,
    services,
  })
}
