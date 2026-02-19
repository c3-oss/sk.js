import type { CloudWatchClient } from '@aws-sdk/client-cloudwatch'
import type { ECSClient } from '@aws-sdk/client-ecs'

import type { Logger } from '@c3-oss/logger'

/**
 * Configuration options for creating an ECS client wrapper.
 * Defines the cluster and optional AWS clients for ECS and CloudWatch operations.
 */
export interface ECSCreateOptions {
  /** The name of the ECS cluster to operate on */
  cluster: string
  /** Optional pre-configured ECS client. If not provided, a new client will be created */
  client?: ECSClient
  /** Optional pre-configured CloudWatch client. If not provided, a new client will be created */
  cloudwatch?: CloudWatchClient
  /** AWS region for the clients (defaults to 'us-east-1') */
  baseRegion?: string
  /** Optional logger for debugging and tracing operations */
  log?: Logger
}

/**
 * Configuration options for listing ECS clusters.
 */
export interface ECSListClustersOptions {
  /** Optional pre-configured ECS client. If not provided, a new client will be created */
  client?: ECSClient
  /** AWS region for the client (defaults to 'us-east-1') */
  baseRegion?: string
  /** Optional logger for debugging and tracing operations */
  log?: Logger
}
