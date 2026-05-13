import { ecs, serviceName } from '@c3-oss/aws-wrapper-ecs'
import { isLeft } from 'fp-ts/lib/Either.js'

import { log } from '../logger.js'

/**
 * ECS service display data.
 */
export interface ServiceRecord {
  /** Service ARN returned by ECS. */
  readonly arn: string
  /** Human-readable service name derived from the ARN. */
  readonly name: string
}

/**
 * Returns the ECS service name when the input is an ARN, otherwise returns the input unchanged.
 */
export const serviceDisplayName = (serviceArnOrName: string): string =>
  serviceName(serviceArnOrName) ?? serviceArnOrName

/**
 * Lists ECS services for a cluster and returns them sorted by display name.
 */
export const listServices = async (region: string, cluster: string): Promise<readonly ServiceRecord[]> => {
  const ecsClient = ecs.create({ log, cluster, baseRegion: region })
  const listServicesResult = await ecsClient.listServices()
  if (isLeft(listServicesResult)) {
    throw listServicesResult.left
  }

  return listServicesResult.right
    .map((arn) => ({ arn, name: serviceDisplayName(arn) }))
    .sort((left, right) => left.name.localeCompare(right.name))
}
