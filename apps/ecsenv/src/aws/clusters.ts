import { ecs } from '@c3-oss/aws-wrapper-ecs'
import { isLeft } from 'fp-ts/lib/Either.js'

import { log } from '../logger.js'

export interface ClusterRecord {
  readonly arn: string
  readonly name: string
}

export const clusterNameFromArn = (arn: string): string => {
  const segments = arn.split('/')
  return segments[segments.length - 1] ?? arn
}

export const listClusters = async (region: string): Promise<readonly ClusterRecord[]> => {
  const result = await ecs.listClusters({ baseRegion: region, log })
  if (isLeft(result)) {
    throw result.left
  }

  return result.right
    .map((arn) => ({ arn, name: clusterNameFromArn(arn) }))
    .sort((left, right) => left.name.localeCompare(right.name))
}
