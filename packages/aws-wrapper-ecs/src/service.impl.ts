// 3rd-party
import { type Either, isLeft, left, right } from 'fp-ts/lib/Either.js'
import _ from 'lodash'

import {
  DescribeServicesCommand,
  type DescribeServicesCommandOutput,
  DescribeTaskDefinitionCommand,
  type DescribeTaskDefinitionCommandOutput,
  type ECSClient,
  type Failure,
  ListClustersCommand,
  type ListClustersCommandOutput,
  ListServicesCommand,
  type ListServicesCommandOutput,
  type Service,
} from '@aws-sdk/client-ecs'

// c3
import type { Logger } from '@c3-oss/logger'
import { errorWrapper } from '@c3-oss/typeguard'
import type { Optional } from '@c3-oss/types'

// local
import type { ServiceWithTaskDef } from './service.interface.js'

// ---------------------------------------------------------------------------------------------------------------------

/**
 * Iterates through ECS services and fetches their associated task definitions.
 * Processes services in chunks to handle AWS API limits and avoid rate limiting.
 *
 * @param client - The ECS client to use for API calls
 * @param serviceDefinitions - Array of ECS service definitions
 * @param log - Optional logger for debugging
 * @param chunkSize - Number of services to process per chunk (default: 10)
 * @returns Either an error or a record mapping task definition ARNs to their descriptions
 */
export const iterateTaskDefinitionsFromServices = async (
  client: ECSClient,
  serviceDefinitions: Service[],
  log?: Logger,
  chunkSize?: number,
): Promise<Either<Error, Record<string, DescribeTaskDefinitionCommandOutput>>> => {
  const taskdefResults: Array<{ taskDefinition: string; result: DescribeTaskDefinitionCommandOutput }> = []

  const taskdefChunks = _.chunk(serviceDefinitions, chunkSize ?? 10)
  for (const chunk of taskdefChunks) {
    const res = await Promise.allSettled(
      chunk.map(async (s) => {
        const taskDefinition = s.taskDefinition
        return !taskDefinition
          ? undefined
          : {
              taskDefinition,
              result: await client.send(new DescribeTaskDefinitionCommand({ taskDefinition })),
            }
      }),
    )
    log?.trace({ response: res })

    const rejected = res.filter((r) => r.status === 'rejected')
    const rejectedReasons = rejected.length > 0 ? rejected.map((r) => r.reason).join(', ') : undefined
    if (rejected.length > 0) {
      return left(new Error(`Failed to describe task definitions: ${rejectedReasons}`))
    }

    const taskdefs = res.map((r) => (r.status === 'fulfilled' ? r.value : undefined)).filter((r) => r !== undefined)
    taskdefResults.push(...taskdefs)
  }

  return right(Object.fromEntries(taskdefResults.map(({ taskDefinition, result }) => [taskDefinition, result])))
}

/**
 * Describes multiple ECS services and their associated task definitions.
 * Combines service descriptions with task definition details in a single operation.
 *
 * @param client - The ECS client to use for API calls
 * @param cluster - The name of the ECS cluster
 * @param serviceArns - Array of service ARNs to describe
 * @param log - Optional logger for debugging
 * @returns Either an error or array of services with their task definitions
 */
export const describeServicesWithTaskDefs = async (
  client: ECSClient,
  cluster: string,
  serviceArns: string[],
  log?: Logger,
): Promise<Either<Error, ServiceWithTaskDef[]>> => {
  try {
    const services: Service[] = []
    const failures: Failure[] = []

    const serviceChunks = _.chunk(serviceArns, 10)
    for (const chunk of serviceChunks) {
      const servicesRes: DescribeServicesCommandOutput = await client.send(
        new DescribeServicesCommand({ cluster, services: chunk }),
      )
      log?.trace({ response: servicesRes }, 'Services response')

      if (servicesRes.failures) {
        failures.push(...servicesRes.failures)
      }
      if (servicesRes.services) {
        services.push(...servicesRes.services)
      }
    }

    const failureReasons = failures.length > 0 ? failures.map((f) => f.reason).join(', ') : undefined
    if (failureReasons) {
      return left(new Error(`Failed to describe services: ${failureReasons}`))
    }

    if (services.length === 0) {
      return right([])
    }

    const taskdefsRes = await iterateTaskDefinitionsFromServices(client, services, log)
    if (isLeft(taskdefsRes)) {
      return left(taskdefsRes.left)
    }

    const taskdefs = taskdefsRes.right

    return right(
      services.map((s) => ({
        service: s,
        taskDefinition:
          s.taskDefinition !== undefined && taskdefs[s.taskDefinition] !== undefined
            ? taskdefs[s.taskDefinition]
            : undefined,
      })),
    )
  } catch (e) {
    return left(errorWrapper(e))
  }
}

/**
 * Lists all services in an ECS cluster.
 * Handles pagination automatically to retrieve all services.
 *
 * @param client - The ECS client to use for API calls
 * @param cluster - The name of the ECS cluster
 * @param log - Optional logger for debugging
 * @returns Either an error or array of service ARNs
 */
export const listServices = async (
  client: ECSClient,
  cluster: string,
  log?: Logger,
): Promise<Either<Error, string[]>> => {
  const arns: string[] = []
  let nextToken: Optional<string> = undefined

  do {
    try {
      const res: ListServicesCommandOutput = await client.send(new ListServicesCommand({ cluster, nextToken }))
      log?.trace({ response: res })

      arns.push(...(res.serviceArns ?? []))
      nextToken = res.nextToken
    } catch (e) {
      return left(errorWrapper(e))
    }
  } while (nextToken)

  return right(arns)
}

/**
 * Lists all ECS clusters in the configured region.
 * Handles pagination automatically to retrieve all clusters.
 *
 * @param client - The ECS client to use for API calls
 * @param log - Optional logger for debugging
 * @returns Either an error or array of cluster ARNs
 */
export const listClusters = async (client: ECSClient, log?: Logger): Promise<Either<Error, string[]>> => {
  const arns: string[] = []
  let nextToken: Optional<string> = undefined

  do {
    try {
      const res: ListClustersCommandOutput = await client.send(new ListClustersCommand({ nextToken }))
      log?.trace({ response: res })

      arns.push(...(res.clusterArns ?? []))
      nextToken = res.nextToken
    } catch (e) {
      return left(errorWrapper(e))
    }
  } while (nextToken)

  return right(arns)
}

/**
 * Extracts the service name from an ECS service ARN.
 * Parses the ARN format: arn:aws:ecs:region:account:service/cluster/service-name
 *
 * @param arn - The ECS service ARN to parse
 * @param failOnMalformedArn - Whether to throw an error for malformed ARNs (default: false)
 * @returns The service name or undefined if ARN is malformed and failOnMalformedArn is false
 * @throws Error if ARN is malformed and failOnMalformedArn is true
 */
export const serviceName = (arn: string, failOnMalformedArn = false) => {
  const segs = arn.split('/')
  if (segs.length !== 3) {
    if (failOnMalformedArn) {
      throw new Error(`Malformed ARN: ${arn}`)
    }
    return undefined
  }
  return segs[2]
}
