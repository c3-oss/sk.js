import { describe, expect, it } from 'vitest'

import { collectEnvironmentAndSecretReferences, parseSecretReference } from '../aws/secrets.js'

describe('parseSecretReference', () => {
  it('parses a standard ARN without JSON key', () => {
    const arn = 'arn:aws:secretsmanager:us-east-1:123456789:secret:my-secret'
    const result = parseSecretReference('DB_PASSWORD', arn)
    expect(result).toEqual({
      envName: 'DB_PASSWORD',
      secretArn: arn,
      secretKey: undefined,
    })
  })

  it('parses an ARN with JSON key and trailing colons', () => {
    const arn = 'arn:aws:secretsmanager:us-east-1:123456789:secret:my-secret:password::'
    const result = parseSecretReference('DB_PASSWORD', arn)
    expect(result).toEqual({
      envName: 'DB_PASSWORD',
      secretArn: 'arn:aws:secretsmanager:us-east-1:123456789:secret:my-secret',
      secretKey: 'password',
    })
  })

  it('parses an ARN with JSON key without trailing colons', () => {
    const arn = 'arn:aws:secretsmanager:us-east-1:123456789:secret:my-secret:password'
    const result = parseSecretReference('DB_PASSWORD', arn)
    expect(result).toEqual({
      envName: 'DB_PASSWORD',
      secretArn: 'arn:aws:secretsmanager:us-east-1:123456789:secret:my-secret',
      secretKey: 'password',
    })
  })

  it('returns undefined for non-ARN values', () => {
    expect(parseSecretReference('FOO', 'not-an-arn')).toBeUndefined()
  })

  it('returns undefined for short segment count', () => {
    expect(parseSecretReference('FOO', 'a:b:c:d:e:f')).toBeUndefined()
  })
})

describe('collectEnvironmentAndSecretReferences', () => {
  it('collects environment variables from containers', () => {
    const containers = [
      {
        environment: [
          { name: 'NODE_ENV', value: 'production' },
          { name: 'PORT', value: '3000' },
        ],
      },
    ]

    const { environment, secretRefs } = collectEnvironmentAndSecretReferences(containers)
    expect(environment).toEqual({ NODE_ENV: 'production', PORT: '3000' })
    expect(secretRefs).toHaveLength(0)
  })

  it('collects secret references from containers', () => {
    const containers = [
      {
        secrets: [
          {
            name: 'DB_PASSWORD',
            valueFrom: 'arn:aws:secretsmanager:us-east-1:123456789:secret:db-creds:password::',
          },
        ],
      },
    ]

    const { environment, secretRefs } = collectEnvironmentAndSecretReferences(containers)
    expect(environment).toEqual({})
    expect(secretRefs).toHaveLength(1)
    expect(secretRefs[0]).toEqual({
      envName: 'DB_PASSWORD',
      secretArn: 'arn:aws:secretsmanager:us-east-1:123456789:secret:db-creds',
      secretKey: 'password',
    })
  })

  it('skips entries with missing name or value', () => {
    const containers = [
      {
        environment: [
          { name: '', value: 'val' },
          { name: 'OK', value: undefined },
          { name: 'VALID', value: 'yes' },
        ],
        secrets: [
          { name: '', valueFrom: 'arn' },
          { name: 'SEC', valueFrom: '' },
        ],
      },
    ]

    const { environment, secretRefs } = collectEnvironmentAndSecretReferences(containers)
    expect(environment).toEqual({ VALID: 'yes' })
    expect(secretRefs).toHaveLength(0)
  })

  it('merges env vars from multiple containers (last wins)', () => {
    const containers = [
      { environment: [{ name: 'FOO', value: 'first' }] },
      { environment: [{ name: 'FOO', value: 'second' }] },
    ]

    const { environment } = collectEnvironmentAndSecretReferences(containers)
    expect(environment.FOO).toBe('second')
  })

  it('handles containers with no environment or secrets', () => {
    const containers = [{}]
    const { environment, secretRefs } = collectEnvironmentAndSecretReferences(containers)
    expect(environment).toEqual({})
    expect(secretRefs).toHaveLength(0)
  })
})
