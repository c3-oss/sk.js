import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager'

import { log } from '../logger.js'

export interface SecretReference {
  readonly envName: string
  readonly secretArn: string
  readonly secretKey?: string
}

export const parseSecretReference = (envName: string, valueFromRaw: string): SecretReference | undefined => {
  const valueFrom = valueFromRaw.endsWith('::') ? valueFromRaw.slice(0, -2) : valueFromRaw
  const segments = valueFrom.split(':')

  if (segments.length < 7) {
    return undefined
  }

  const secretArn = segments.slice(0, 7).join(':')
  const secretKey = segments[7]
  return { envName, secretArn, secretKey }
}

export const collectEnvironmentAndSecretReferences = (
  containers: readonly {
    readonly environment?: readonly { readonly name?: string; readonly value?: string }[]
    readonly secrets?: readonly { readonly name?: string; readonly valueFrom?: string }[]
  }[],
): { environment: Record<string, string>; secretRefs: readonly SecretReference[] } => {
  const environment: Record<string, string> = {}
  const secretRefs: SecretReference[] = []

  for (const container of containers) {
    const containerEnvironment = container.environment ?? []
    for (const variable of containerEnvironment) {
      if (!variable.name || variable.value === undefined) {
        continue
      }
      environment[variable.name] = variable.value
    }

    const containerSecrets = container.secrets ?? []
    for (const secret of containerSecrets) {
      if (!secret.name || !secret.valueFrom) {
        continue
      }
      const parsedReference = parseSecretReference(secret.name, secret.valueFrom)
      if (!parsedReference) {
        continue
      }
      secretRefs.push(parsedReference)
    }
  }

  return { environment, secretRefs }
}

const chunk = <T>(array: readonly T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

export const resolveSecrets = async (
  secretRefs: readonly SecretReference[],
  region: string,
  chunkSize = 10,
): Promise<Record<string, string>> => {
  if (secretRefs.length === 0) {
    return {}
  }

  const secretsManager = new SecretsManagerClient({ region })
  const uniqueSecretArns = [...new Set(secretRefs.map((reference) => reference.secretArn))]

  const secretStringByArn: Record<string, string> = {}

  for (const arnChunk of chunk(uniqueSecretArns, chunkSize)) {
    const secretResponses = await Promise.all(
      arnChunk.map((secretArn) => secretsManager.send(new GetSecretValueCommand({ SecretId: secretArn }))),
    )

    for (const response of secretResponses) {
      if (!response.ARN || response.SecretString === undefined) {
        continue
      }
      secretStringByArn[response.ARN] = response.SecretString
    }
  }

  const resolvedSecrets: Record<string, string> = {}
  for (const reference of secretRefs) {
    const secretRaw = secretStringByArn[reference.secretArn]
    if (secretRaw === undefined) {
      continue
    }

    if (!reference.secretKey) {
      resolvedSecrets[reference.envName] = secretRaw
      continue
    }

    try {
      const parsedSecret = JSON.parse(secretRaw) as Record<string, string>
      if (typeof parsedSecret[reference.secretKey] === 'string') {
        resolvedSecrets[reference.envName] = parsedSecret[reference.secretKey]
      }
    } catch (error) {
      log.warn(`failed to parse secret JSON for ${reference.envName} (ARN: ${reference.secretArn}): ${error}`)
    }
  }

  return resolvedSecrets
}
