import { describe, expect, it } from 'vitest'

import { clusterNameFromArn } from '../aws/clusters.js'

describe('clusterNameFromArn', () => {
  it('extracts cluster name from ARN', () => {
    expect(clusterNameFromArn('arn:aws:ecs:us-east-1:123456789:cluster/my-cluster')).toBe('my-cluster')
  })

  it('returns the input when there is no slash', () => {
    expect(clusterNameFromArn('my-cluster')).toBe('my-cluster')
  })

  it('handles multi-segment paths', () => {
    expect(clusterNameFromArn('prefix/middle/cluster-name')).toBe('cluster-name')
  })
})
