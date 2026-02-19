import type { DescribeTaskDefinitionCommandOutput, Service } from '@aws-sdk/client-ecs'
import type { Optional } from '@c3-oss/types'

/**
 * Combined representation of an ECS service and its associated task definition.
 * Useful for operations that need both service metadata and task definition details.
 */
export interface ServiceWithTaskDef {
  /** The ECS service object containing service configuration and status */
  service: Service
  /** The task definition associated with the service, if available */
  taskDefinition: Optional<DescribeTaskDefinitionCommandOutput>
}
