import { describe, expect, it } from 'vitest'

import { buildProviderCommand } from '../commands.js'

describe('buildProviderCommand', () => {
  describe('claude', () => {
    it('builds command with auto approval', () => {
      const result = buildProviderCommand({
        provider: 'claude',
        model: 'claude-opus-4-6',
        autoApproval: true,
        cwd: '/tmp',
      })
      expect(result.command).toBe('claude')
      expect(result.args).toContain('-p')
      expect(result.args).toContain('--verbose')
      expect(result.args).toContain('stream-json')
      expect(result.args).toContain('claude-opus-4-6')
      expect(result.args).toContain('bypassPermissions')
    })

    it('builds command without auto approval', () => {
      const result = buildProviderCommand({
        provider: 'claude',
        model: 'claude-opus-4-6',
        autoApproval: false,
        cwd: '/tmp',
      })
      expect(result.args).toContain('default')
      expect(result.args).not.toContain('bypassPermissions')
    })
  })

  describe('cursor-agent', () => {
    it('builds command with auto approval', () => {
      const result = buildProviderCommand({
        provider: 'cursor-agent',
        model: 'opus-4.6',
        autoApproval: true,
        cwd: '/tmp',
      })
      expect(result.command).toBe('cursor-agent')
      expect(result.args).toContain('--print')
      expect(result.args).toContain('--trust')
      expect(result.args).toContain('--force')
    })

    it('builds command without auto approval', () => {
      const result = buildProviderCommand({
        provider: 'cursor-agent',
        model: 'opus-4.6',
        autoApproval: false,
        cwd: '/tmp',
      })
      expect(result.args).not.toContain('--force')
    })
  })

  describe('gemini', () => {
    it('builds command with auto approval', () => {
      const result = buildProviderCommand({
        provider: 'gemini',
        model: 'gemini-2.5-pro',
        autoApproval: true,
        cwd: '/tmp',
      })
      expect(result.command).toBe('gemini')
      expect(result.args).toContain('--prompt')
      expect(result.args).toContain(' ')
      expect(result.args).toContain('--yolo')
    })

    it('builds command without auto approval', () => {
      const result = buildProviderCommand({
        provider: 'gemini',
        model: 'gemini-2.5-pro',
        autoApproval: false,
        cwd: '/tmp',
      })
      expect(result.args).toContain('--approval-mode')
      expect(result.args).toContain('default')
    })

    it('does not include redundant instruction text in prompt flag', () => {
      const result = buildProviderCommand({
        provider: 'gemini',
        model: 'gemini-2.5-pro',
        autoApproval: true,
        cwd: '/tmp',
      })
      const promptIndex = result.args.indexOf('--prompt')
      expect(promptIndex).toBeGreaterThan(-1)
      const promptValue = result.args[promptIndex + 1]
      expect(promptValue).toBe(' ')
    })
  })

  describe('codex', () => {
    it('builds command with auto approval', () => {
      const result = buildProviderCommand({
        provider: 'codex',
        model: 'gpt-5.3-codex',
        autoApproval: true,
        cwd: '/my/project',
      })
      expect(result.command).toBe('codex')
      expect(result.args).toContain('exec')
      expect(result.args).toContain('--json')
      expect(result.args).toContain('--skip-git-repo-check')
      expect(result.args).toContain('/my/project')
      expect(result.args).toContain('never')
      expect(result.args).toContain('danger-full-access')
    })

    it('builds command without auto approval', () => {
      const result = buildProviderCommand({
        provider: 'codex',
        model: 'gpt-5.3-codex',
        autoApproval: false,
        cwd: '/tmp',
      })
      expect(result.args).toContain('workspace-write')
      expect(result.args).not.toContain('danger-full-access')
    })
  })

  describe('unknown provider', () => {
    it('returns provider name as command with empty args', () => {
      const result = buildProviderCommand({
        provider: 'unknown-provider' as never,
        model: 'some-model',
        autoApproval: true,
        cwd: '/tmp',
      })
      expect(result.command).toBe('unknown-provider')
      expect(result.args).toEqual([])
    })
  })
})
