import { ecs, serviceName } from '@c3-oss/aws-wrapper-ecs'
import { isLeft } from 'fp-ts/lib/Either.js'

import { log } from '../logger.js'

export interface ServiceRecord {
  readonly arn: string
  readonly name: string
}

export const serviceDisplayName = (serviceArnOrName: string): string =>
  serviceName(serviceArnOrName) ?? serviceArnOrName

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
