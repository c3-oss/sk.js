import { describe, expect, it } from 'vitest'

import { parseProviderLine } from '../normalize.js'

describe('parseProviderLine', () => {
  it('returns empty for empty line', () => {
    expect(parseProviderLine('claude', '')).toEqual({})
    expect(parseProviderLine('claude', '   ')).toEqual({})
  })

  describe('claude', () => {
    it('parses init event', () => {
      const result = parseProviderLine('claude', '{"type":"system","subtype":"init","model":"claude-opus-4-6"}')
      expect(result.pretty?.level).toBe('info')
      expect(result.pretty?.text).toContain('claude-opus-4-6')
    })

    it('parses assistant text message', () => {
      const result = parseProviderLine(
        'claude',
        '{"type":"assistant","message":{"content":[{"type":"text","text":"Hello"}]}}',
      )
      expect(result.pretty?.level).toBe('assistant')
      expect(result.outputDelta).toBe('Hello')
    })

    it('parses tool use message', () => {
      const result = parseProviderLine(
        'claude',
        '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"read_file"}]}}',
      )
      expect(result.pretty?.level).toBe('tool')
      expect(result.pretty?.text).toContain('read_file')
    })

    it('parses result event', () => {
      const result = parseProviderLine('claude', '{"type":"result","result":"Final answer","is_error":false}')
      expect(result.pretty?.level).toBe('assistant')
      expect(result.finalOutput).toBe('Final answer')
    })

    it('parses error result', () => {
      const result = parseProviderLine('claude', '{"type":"result","result":"Something failed","is_error":true}')
      expect(result.pretty?.level).toBe('error')
      expect(result.errorMessage).toBe('Something failed')
    })
  })

  describe('cursor-agent', () => {
    it('parses init event', () => {
      const result = parseProviderLine('cursor-agent', '{"type":"system","subtype":"init","model":"opus-4.6"}')
      expect(result.pretty?.level).toBe('info')
      expect(result.pretty?.text).toContain('opus-4.6')
    })

    it('parses tool call', () => {
      const result = parseProviderLine('cursor-agent', '{"type":"tool_call","subtype":"start"}')
      expect(result.pretty?.level).toBe('tool')
    })

    it('parses result', () => {
      const result = parseProviderLine('cursor-agent', '{"type":"result","result":"Done","is_error":false}')
      expect(result.finalOutput).toBe('Done')
    })
  })

  describe('gemini', () => {
    it('parses init event', () => {
      const result = parseProviderLine('gemini', '{"type":"init","model":"gemini-2.5-pro"}')
      expect(result.pretty?.level).toBe('info')
      expect(result.pretty?.text).toContain('gemini-2.5-pro')
    })

    it('parses tool use', () => {
      const result = parseProviderLine('gemini', '{"type":"tool_use","tool_name":"write_file"}')
      expect(result.pretty?.level).toBe('tool')
      expect(result.pretty?.text).toContain('write_file')
    })

    it('parses tool result', () => {
      const result = parseProviderLine('gemini', '{"type":"tool_result","status":"ok"}')
      expect(result.pretty?.level).toBe('info')
    })

    it('parses assistant message', () => {
      const result = parseProviderLine('gemini', '{"type":"message","role":"assistant","content":"Hi there"}')
      expect(result.pretty?.level).toBe('assistant')
      expect(result.outputDelta).toBe('Hi there')
    })

    it('parses error', () => {
      const result = parseProviderLine('gemini', '{"error":"something went wrong"}')
      expect(result.pretty?.level).toBe('error')
      expect(result.errorMessage).toBe('something went wrong')
    })

    it('parses response with final output', () => {
      const result = parseProviderLine('gemini', '{"response":"Final answer here"}')
      expect(result.finalOutput).toBe('Final answer here')
    })
  })

  describe('codex', () => {
    it('parses thread started', () => {
      const result = parseProviderLine('codex', '{"type":"thread.started"}')
      expect(result.pretty?.level).toBe('info')
    })

    it('parses agent message', () => {
      const result = parseProviderLine(
        'codex',
        '{"type":"item.completed","item":{"type":"agent_message","text":"Done"}}',
      )
      expect(result.pretty?.level).toBe('assistant')
      expect(result.outputDelta).toBe('Done')
      expect(result.finalOutput).toBe('Done')
    })

    it('parses command execution', () => {
      const result = parseProviderLine(
        'codex',
        '{"type":"item.completed","item":{"type":"command_execution","command":"ls","status":"completed"}}',
      )
      expect(result.pretty?.level).toBe('tool')
    })

    it('parses error event', () => {
      const result = parseProviderLine('codex', '{"type":"error","message":"rate limited"}')
      expect(result.pretty?.level).toBe('error')
      expect(result.errorMessage).toBe('rate limited')
    })

    it('parses turn completed', () => {
      const result = parseProviderLine('codex', '{"type":"turn.completed"}')
      expect(result.pretty?.level).toBe('info')
    })

    it('parses turn failed', () => {
      const result = parseProviderLine('codex', '{"type":"turn.failed","error":{"message":"timeout"}}')
      expect(result.pretty?.level).toBe('error')
      expect(result.errorMessage).toBe('timeout')
    })
  })

  describe('non-JSON lines', () => {
    it('treats line with error keyword as warning', () => {
      const result = parseProviderLine('claude', 'Error: connection failed')
      expect(result.pretty?.level).toBe('warn')
    })

    it('treats regular non-JSON line as info', () => {
      const result = parseProviderLine('claude', 'Starting session...')
      expect(result.pretty?.level).toBe('info')
    })
  })
})
