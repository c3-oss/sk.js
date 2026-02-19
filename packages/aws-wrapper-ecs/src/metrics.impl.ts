// 3rd party
import {
  type CloudWatchClient,
  GetMetricDataCommand,
  type MetricDataQuery,
  type MetricDataResult,
} from '@aws-sdk/client-cloudwatch'

import { type Either, left, right } from 'fp-ts/lib/Either.js'
import { DateTime } from 'luxon'

// c3
import { errorWrapper } from '@c3-oss/typeguard'

import type { Logger } from '@c3-oss/logger'
import type { Optional } from '@c3-oss/types'

// local
import type { ServiceMetricsOptions, ServiceMetricsResult } from './metrics.interface.js'

// ---------------------------------------------------------------------------------------------------------------------

/**
 * Creates CloudWatch metric data queries for pending task counts.
 * Generates one query per service to retrieve ECS ContainerInsights metrics.
 *
 * @param cluster - The ECS cluster name
 * @param services - Array of service names to query metrics for
 * @param options - Metrics query configuration
 * @returns Array of CloudWatch metric data queries
 */
const dataQuery = (cluster: string, services: string[], options: ServiceMetricsOptions): MetricDataQuery[] =>
  services.map((s) => ({
    Id: `pendingTasks_${s.replaceAll('-', '_')}`,
    MetricStat: {
      Metric: {
        Namespace: 'ECS/ContainerInsights',
        MetricName: 'PendingTaskCount',
        Dimensions: [
          { Name: 'ClusterName', Value: cluster },
          { Name: 'ServiceName', Value: s },
        ],
      },
      Period: options.period.as('seconds'),
      Stat: options.stat,
    },
    ReturnData: true,
  }))

/**
 * Converts CloudWatch metric data result to service metrics result format.
 * Transforms raw CloudWatch data into structured service metrics with timestamps.
 *
 * @param data - Raw CloudWatch metric data result
 * @returns Structured service metrics result
 */
const toServiceMetricsResult = (data: MetricDataResult): ServiceMetricsResult => {
  const service = data.Label ?? ''
  const timestamps = data.Timestamps ?? []
  const values = data.Values ?? []

  return {
    service,
    data: values.map((v, i) => ({
      timestamp: DateTime.fromJSDate(timestamps[i] as Date, { zone: 'utc' }),
      value: v,
    })),
  }
}

/**
 * Internal helper function to fetch CloudWatch metric data.
 * Sends a GetMetricData command with the specified parameters.
 *
 * @param cloudwatch - The CloudWatch client to use
 * @param start - Start time for the metrics query
 * @param end - End time for the metrics query
 * @param queries - Array of metric data queries
 * @param nextToken - Optional pagination token for large result sets
 * @returns Promise resolving to CloudWatch metric data response
 */
const _pendingTasks = async (
  cloudwatch: CloudWatchClient,
  start: Date,
  end: Date,
  queries: MetricDataQuery[],
  nextToken?: string,
) =>
  cloudwatch.send(
    new GetMetricDataCommand({
      StartTime: start,
      EndTime: end,
      MetricDataQueries: queries,
      NextToken: nextToken,
    }),
  )

/**
 * Retrieves pending task count metrics for ECS services from CloudWatch.
 * Queries ECS ContainerInsights metrics and handles pagination automatically.
 *
 * @param cloudwatch - The CloudWatch client to use for API calls
 * @param cluster - The name of the ECS cluster
 * @param services - Array of service names to get metrics for
 * @param options - Configuration for the metrics query (time range, period, stat)
 * @param log - Optional logger for debugging
 * @returns Either an error or array of service metrics results
 */
export const pendingTasks = async (
  cloudwatch: CloudWatchClient,
  cluster: string,
  services: string[],
  options: ServiceMetricsOptions,
  log?: Logger,
): Promise<Either<Error, ServiceMetricsResult[]>> => {
  let nextToken: Optional<string> = undefined

  const { start, duration } = options
  const startDate = start.toJSDate()

  const end = start.plus(duration)
  const endDate = end.toJSDate()

  const queries = dataQuery(cluster, services, options)
  const results: ServiceMetricsResult[] = []

  log?.trace({ queries }, 'Cloudwatch queries')

  do {
    try {
      const res = await _pendingTasks(cloudwatch, startDate, endDate, queries, nextToken)
      log?.trace({ response: res }, 'Cloudwatch response')

      const data = (res.MetricDataResults ?? []).map(toServiceMetricsResult)
      results.push(...data)

      nextToken = res.NextToken
    } catch (e) {
      return left(errorWrapper(e))
    }
  } while (nextToken)

  return right(results)
}
