import { ecs } from '@c3-oss/aws-wrapper-ecs'
import { isLeft } from 'fp-ts/lib/Either.js'

import { log } from '../logger.js'

/**
 * ECS cluster display data.
 */
export interface ClusterRecord {
  /** Cluster ARN returned by ECS. */
  readonly arn: string
  /** Human-readable cluster name derived from the ARN. */
  readonly name: string
}

/**
 * Extracts the final path segment from an ECS cluster ARN.
 */
export const clusterNameFromArn = (arn: string): string => {
  const segments = arn.split('/')
  return segments[segments.length - 1] ?? arn
}

/**
 * Lists ECS clusters for a region and returns them sorted by display name.
 */
export const listClusters = async (region: string): Promise<readonly ClusterRecord[]> => {
  const result = await ecs.listClusters({ baseRegion: region, log })
  if (isLeft(result)) {
    throw result.left
  }

  return result.right
    .map((arn) => ({ arn, name: clusterNameFromArn(arn) }))
    .sort((left, right) => left.name.localeCompare(right.name))
}
