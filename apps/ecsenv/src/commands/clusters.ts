import type { ParsedArgv } from '../argv.js'
import { getLastFlagValue, getRegion } from '../argv.js'
import { listClusters } from '../aws/clusters.js'
import type { ClusterRecord } from '../aws/clusters.js'
import { parseListOutputFormat, printRows } from '../table.js'

const toClustersRows = (clusters: readonly ClusterRecord[]): readonly Record<string, unknown>[] =>
  clusters.map((cluster) => ({
    name: cluster.name,
    arn: cluster.arn,
  }))

export const runClustersCommand = async (parsed: ParsedArgv): Promise<void> => {
  const region = getRegion(parsed)
  const outputFormat = parseListOutputFormat(getLastFlagValue(parsed, 'output-format'))
  const clusters = await listClusters(region)

  printRows(toClustersRows(clusters), outputFormat, {
    region,
    count: clusters.length,
    clusters,
  })
}
