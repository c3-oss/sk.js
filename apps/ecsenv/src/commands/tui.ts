import type { ParsedArgv } from '../argv.js'
import { getLastFlagValue, getRegion } from '../argv.js'
import { clusterNameFromArn, listClusters } from '../aws/clusters.js'
import { extractEnvironment } from '../aws/extract.js'
import { listServices } from '../aws/services.js'
import { serviceDisplayName } from '../aws/services.js'
import { selectOption } from '../ui/selection-prompt.js'

export const runInteractiveCommand = async (parsed: ParsedArgv): Promise<void> => {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('interactive mode requires a TTY. Use CLI commands: clusters, services, extract')
  }

  const region = getRegion(parsed)
  const outputPath = getLastFlagValue(parsed, 'output') ?? '.env.sh'

  console.log(`Fetching ECS clusters in region ${region}...`)
  const clusters = await listClusters(region)
  if (clusters.length === 0) {
    console.log(`No ECS clusters found in region ${region}. Exiting.`)
    return
  }

  const clusterSelection = await selectOption(
    `Select ECS cluster (${region})`,
    clusters.map((cluster) => ({ value: cluster.arn, label: cluster.name })),
  )
  if (!clusterSelection) {
    console.log('Cancelled')
    return
  }

  console.log(`Fetching services for ${clusterNameFromArn(clusterSelection)}...`)
  const services = await listServices(region, clusterSelection)
  if (services.length === 0) {
    console.log(`No services found for cluster ${clusterNameFromArn(clusterSelection)}. Exiting.`)
    return
  }

  const serviceSelection = await selectOption(
    `Select service (${clusterNameFromArn(clusterSelection)})`,
    services.map((service) => ({ value: service.arn, label: service.name })),
  )
  if (!serviceSelection) {
    console.log('Cancelled')
    return
  }

  console.log(`Extracting environment from ${serviceDisplayName(serviceSelection)}...`)
  const extraction = await extractEnvironment({
    cluster: clusterSelection,
    service: serviceSelection,
    region,
    outputPath,
  })

  console.log(
    `Created ${extraction.outputPath} with ${extraction.envCount} environment variables and ${extraction.secretCount} secrets`,
  )
  console.log(`Run: source ${extraction.outputPath}`)
}
