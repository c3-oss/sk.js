import path from 'node:path'

import { ecs } from '@c3-oss/aws-wrapper-ecs'
import { isLeft } from 'fp-ts/lib/Either.js'
import fs from 'fs-extra'

import { log } from '../logger.js'
import { collectEnvironmentAndSecretReferences, resolveSecrets } from './secrets.js'
import { serviceDisplayName } from './services.js'

export interface ExtractOptions {
  readonly cluster: string
  readonly service: string
  readonly region: string
  readonly outputPath: string
}

export interface ExtractResult {
  readonly cluster: string
  readonly service: string
  readonly envCount: number
  readonly secretCount: number
  readonly outputPath: string
}

const VALID_SHELL_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/

export const toShellFile = (environment: Record<string, string>): string =>
  Object.entries(environment)
    .filter(([name]) => {
      if (!VALID_SHELL_IDENTIFIER.test(name)) {
        log.warn(`skipping invalid shell identifier: ${name}`)
        return false
      }
      return true
    })
    .map(([name, value]) => `export ${name}='${value.replaceAll("'", "'\\''")}'`)
    .sort((left, right) => left.localeCompare(right))
    .concat('')
    .join('\n')

export const extractEnvironment = async (options: ExtractOptions): Promise<ExtractResult> => {
  const ecsClient = ecs.create({ log, cluster: options.cluster, baseRegion: options.region })
  const describeResult = await ecsClient.describeServicesWithTaskDefs([options.service])
  if (isLeft(describeResult)) {
    throw describeResult.left
  }

  const serviceWithTaskDefinition = describeResult.right[0]
  if (!serviceWithTaskDefinition) {
    throw new Error(`service not found: ${options.service}`)
  }

  const serviceCanonicalName = serviceWithTaskDefinition.service.serviceName ?? serviceDisplayName(options.service)
  const containerDefinitions = serviceWithTaskDefinition.taskDefinition?.taskDefinition?.containerDefinitions ?? []

  if (containerDefinitions.length === 0) {
    throw new Error(`service ${serviceCanonicalName} does not have any container definitions`)
  }

  const { environment, secretRefs } = collectEnvironmentAndSecretReferences(containerDefinitions)
  const resolvedSecrets = await resolveSecrets(secretRefs, options.region)

  const mergedEnvironment: Record<string, string> = {
    ...resolvedSecrets,
    ...environment,
  }

  const renderedShell = toShellFile(mergedEnvironment)
  const absoluteOutputPath = path.resolve(process.cwd(), options.outputPath)
  await fs.writeFile(absoluteOutputPath, renderedShell)

  return {
    cluster: options.cluster,
    service: serviceCanonicalName,
    envCount: Object.keys(environment).length,
    secretCount: Object.keys(resolvedSecrets).length,
    outputPath: absoluteOutputPath,
  }
}
