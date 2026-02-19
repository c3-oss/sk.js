// 3rd party
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch'
import { ECSClient } from '@aws-sdk/client-ecs'

// local
import { pendingTasks } from './metrics.impl.js'
import { describeServicesWithTaskDefs, listClusters as listClustersImpl, listServices } from './service.impl.js'

import type { ECSCreateOptions, ECSListClustersOptions } from './ecs.interface.js'
import type { ServiceMetricsOptions } from './metrics.interface.js'

// ---------------------------------------------------------------------------------------------------------------------

/**
 * Factory object for creating ECS client wrappers.
 * Provides a fluent API for creating configured ECS clients with service and metrics capabilities.
 */
export const ecs = {
  /**
   * Lists all ECS clusters in the specified region.
   *
   * @param options - Configuration options for listing clusters
   * @returns Promise resolving to array of cluster ARNs or error
   */
  listClusters: (options: ECSListClustersOptions = {}) => {
    const region = options.baseRegion ?? 'us-east-1'
    const client = options.client ?? new ECSClient({ region })
    return listClustersImpl(client, options.log)
  },

  /**
   * Creates a new ECS client wrapper with the specified configuration.
   * Initializes ECS and CloudWatch clients for the given cluster and region.
   *
   * @param options - Configuration options for the ECS client
   * @returns An object with methods for ECS operations and metrics
   */
  create: (options: ECSCreateOptions) => {
    const { cluster, log } = options

    const region = options.baseRegion ?? 'us-east-1'
    const client = options.client ?? new ECSClient({ region })
    const cloudwatch = options.cloudwatch ?? new CloudWatchClient({ region })

    return {
      /**
       * Lists all services in the configured ECS cluster.
       * @returns Promise resolving to array of service ARNs or error
       */
      listServices: () => listServices(client, cluster, log),

      /**
       * Describes multiple ECS services along with their task definitions.
       * @param services - Array of service ARNs to describe
       * @returns Promise resolving to array of services with task definitions or error
       */
      describeServicesWithTaskDefs: (services: string[]) =>
        describeServicesWithTaskDefs(client, cluster, services, log),

      /** Metrics-related operations for the ECS cluster */
      metrics: {
        /**
         * Retrieves pending task count metrics for specified services.
         * @param services - Array of service names to get metrics for
         * @param options - Metrics query configuration
         * @returns Promise resolving to metrics data or error
         */
        pendingTasks: (services: string[], options: ServiceMetricsOptions) =>
          pendingTasks(cloudwatch, cluster, services, options),
      },
    }
  },
}
