import type { DateTime, Duration } from 'luxon'

/**
 * Supported CloudWatch statistic types for ECS service metrics.
 * These statistics define how metric data points are aggregated over time periods.
 */
export type ServiceMetricsStat = 'Average' | 'Sum' | 'Minimum' | 'Maximum' | 'SampleCount'

/**
 * Configuration options for retrieving ECS service metrics from CloudWatch.
 * Defines the time range, aggregation period, and statistic type for metric queries.
 */
export interface ServiceMetricsOptions {
  /** Start time for the metrics query */
  start: DateTime
  /** Duration of the time range to query */
  duration: Duration
  /** Time period for aggregating metric data points */
  period: Duration
  /** Statistical function to apply to the metric data */
  stat: ServiceMetricsStat
}

/**
 * Individual data point for service metrics.
 * Represents a single timestamped metric value.
 */
export interface ServiceMetricsData {
  /** The timestamp when this metric value was recorded */
  timestamp: DateTime
  /** The numeric value of the metric at this timestamp */
  value: number
}

/**
 * Result of a service metrics query.
 * Contains the service name and all metric data points for that service.
 */
export interface ServiceMetricsResult {
  /** Name of the ECS service these metrics belong to */
  service: string
  /** Array of timestamped metric data points */
  data: ServiceMetricsData[]
}
