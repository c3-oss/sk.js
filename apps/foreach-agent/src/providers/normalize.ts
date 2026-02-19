import type { PrettyLogLine, Provider } from '../dtos/types.js'
import { nowIso } from '../utils/time.js'

export interface ParsedLine {
  readonly pretty?: PrettyLogLine
  readonly outputDelta?: string
  readonly finalOutput?: string
  readonly errorMessage?: string
}

const info = (text: string): PrettyLogLine => ({ ts: nowIso(), level: 'info', text })
const warn = (text: string): PrettyLogLine => ({ ts: nowIso(), level: 'warn', text })
const error = (text: string): PrettyLogLine => ({ ts: nowIso(), level: 'error', text })
const tool = (text: string): PrettyLogLine => ({ ts: nowIso(), level: 'tool', text })
const assistant = (text: string): PrettyLogLine => ({ ts: nowIso(), level: 'assistant', text })

const readTextFromMessage = (payload: unknown): string | undefined => {
  if (typeof payload === 'string') {
    return payload
  }

  if (payload !== null && typeof payload === 'object') {
    if ('text' in payload && typeof payload.text === 'string') {
      return payload.text
    }

    if ('content' in payload) {
      const content = payload.content
      if (typeof content === 'string') {
        return content
      }

      if (Array.isArray(content)) {
        const parts = content
          .map((item) => {
            if (item !== null && typeof item === 'object' && 'text' in item && typeof item.text === 'string') {
              return item.text
            }

            return ''
          })
          .filter((part) => part.length > 0)

        if (parts.length > 0) {
          return parts.join('\n')
        }
      }
    }
  }

  return undefined
}

const parseJsonLine = (line: string): unknown | null => {
  const normalized = line.trim()
  if (!(normalized.startsWith('{') && normalized.endsWith('}'))) {
    return null
  }

  try {
    return JSON.parse(normalized)
  } catch {
    return null
  }
}

const parseClaudeLine = (json: Record<string, unknown>, rawLine: string): ParsedLine => {
  const type = json.type
  if (type === 'system' && json.subtype === 'init') {
    const model = typeof json.model === 'string' ? json.model : 'unknown'
    return { pretty: info(`session initialized (${model})`) }
  }

  if (type === 'assistant') {
    const message = json.message
    if (message !== null && typeof message === 'object' && 'content' in message && Array.isArray(message.content)) {
      for (const item of message.content) {
        if (item !== null && typeof item === 'object') {
          if ('type' in item && item.type === 'tool_use') {
            const toolName = typeof item.name === 'string' ? item.name : 'tool'
            return { pretty: tool(`tool call: ${toolName}`) }
          }

          if ('type' in item && item.type === 'text' && typeof item.text === 'string') {
            return { pretty: assistant(item.text), outputDelta: item.text }
          }
        }
      }
    }
  }

  if (type === 'user' && 'tool_use_result' in json) {
    return { pretty: info('tool result received') }
  }

  if (type === 'result') {
    const isError = json.is_error === true
    const resultText = typeof json.result === 'string' ? json.result : rawLine
    return isError
      ? { pretty: error(resultText), errorMessage: resultText }
      : { pretty: assistant(resultText), finalOutput: resultText }
  }

  return { pretty: info(rawLine) }
}

const parseCursorLine = (json: Record<string, unknown>, rawLine: string): ParsedLine => {
  const type = json.type

  if (type === 'system' && json.subtype === 'init') {
    const model = typeof json.model === 'string' ? json.model : 'unknown'
    return { pretty: info(`session initialized (${model})`) }
  }

  if (type === 'tool_call') {
    const subtype = typeof json.subtype === 'string' ? json.subtype : 'event'
    return { pretty: tool(`tool call ${subtype}`) }
  }

  if (type === 'assistant') {
    const message = json.message
    const text = readTextFromMessage(message)
    if (text !== undefined) {
      return { pretty: assistant(text), outputDelta: text }
    }
  }

  if (type === 'result') {
    const isError = json.is_error === true
    const resultText = typeof json.result === 'string' ? json.result : rawLine
    return isError
      ? { pretty: error(resultText), errorMessage: resultText }
      : { pretty: assistant(resultText), finalOutput: resultText }
  }

  if (type === 'thinking') {
    return { pretty: info('thinking...') }
  }

  return { pretty: info(rawLine) }
}

const parseGeminiLine = (json: Record<string, unknown>, rawLine: string): ParsedLine => {
  if ('type' in json && json.type === 'init') {
    const model = typeof json.model === 'string' ? json.model : 'unknown'
    return { pretty: info(`session initialized (${model})`) }
  }

  if ('type' in json && json.type === 'tool_use') {
    const name = typeof json.tool_name === 'string' ? json.tool_name : 'tool'
    return { pretty: tool(`tool call: ${name}`) }
  }

  if ('type' in json && json.type === 'tool_result') {
    const status = typeof json.status === 'string' ? json.status : 'unknown'
    return { pretty: info(`tool result: ${status}`) }
  }

  if ('type' in json && json.type === 'message' && json.role === 'assistant' && typeof json.content === 'string') {
    return { pretty: assistant(json.content), outputDelta: json.content }
  }

  if ('type' in json && json.type === 'result') {
    const status = json.status === 'success' ? 'success' : 'error'
    if (status === 'error') {
      return { pretty: error(rawLine), errorMessage: rawLine }
    }

    return { pretty: info('completed') }
  }

  if ('response' in json && typeof json.response === 'string') {
    return { pretty: assistant(json.response), finalOutput: json.response }
  }

  if ('error' in json) {
    const errorValue = json.error
    const message = typeof errorValue === 'string' ? errorValue : JSON.stringify(errorValue)
    return { pretty: error(message), errorMessage: message }
  }

  return { pretty: info(rawLine) }
}

const parseCodexLine = (json: Record<string, unknown>, rawLine: string): ParsedLine => {
  const type = json.type

  if (type === 'thread.started') {
    return { pretty: info('thread started') }
  }

  if (type === 'item.completed' && json.item !== null && typeof json.item === 'object') {
    const item = json.item as Record<string, unknown>
    const itemType = item.type

    if (itemType === 'agent_message' && typeof item.text === 'string') {
      return { pretty: assistant(item.text), outputDelta: item.text, finalOutput: item.text }
    }

    if (itemType === 'command_execution') {
      const command = typeof item.command === 'string' ? item.command : 'command'
      const status = typeof item.status === 'string' ? item.status : 'unknown'
      return { pretty: tool(`command ${status}: ${command}`) }
    }

    if (itemType === 'error' && typeof item.message === 'string') {
      return { pretty: error(item.message), errorMessage: item.message }
    }
  }

  if (type === 'item.started' && json.item !== null && typeof json.item === 'object') {
    const item = json.item as Record<string, unknown>
    if (item.type === 'command_execution' && typeof item.command === 'string') {
      return { pretty: tool(`running: ${item.command}`) }
    }
  }

  if (type === 'error') {
    const message = typeof json.message === 'string' ? json.message : rawLine
    return { pretty: error(message), errorMessage: message }
  }

  if (type === 'turn.failed' && json.error !== null && typeof json.error === 'object') {
    const value = 'message' in json.error && typeof json.error.message === 'string' ? json.error.message : rawLine
    return { pretty: error(value), errorMessage: value }
  }

  if (type === 'turn.completed') {
    return { pretty: info('completed') }
  }

  return { pretty: info(rawLine) }
}

export const parseProviderLine = (provider: Provider, line: string): ParsedLine => {
  const trimmed = line.trim()
  if (trimmed.length === 0) {
    return {}
  }

  const json = parseJsonLine(trimmed)
  if (json === null || typeof json !== 'object') {
    const lower = trimmed.toLowerCase()
    if (lower.includes('error') || lower.includes('failed')) {
      return { pretty: warn(trimmed) }
    }

    return { pretty: info(trimmed) }
  }

  const payload = json as Record<string, unknown>

  switch (provider) {
    case 'claude':
      return parseClaudeLine(payload, trimmed)
    case 'cursor-agent':
      return parseCursorLine(payload, trimmed)
    case 'gemini':
      return parseGeminiLine(payload, trimmed)
    case 'codex':
      return parseCodexLine(payload, trimmed)
    default:
      return { pretty: info(trimmed) }
  }
}
