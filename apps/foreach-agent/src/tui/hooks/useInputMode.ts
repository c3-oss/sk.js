import { useState } from 'react'

export type InputMode =
  | { readonly kind: 'none' }
  | {
      readonly kind: 'single'
      readonly intent:
        | 'create-template-name'
        | 'run-edit-model'
        | 'run-edit-concurrency'
        | 'run-edit-retries'
        | 'run-edit-timeout'
        | 'run-edit-cwd'
        | 'run-edit-path'
        | 'monitor-search'
        | 'runs-search'
        | 'monitor-export-json'
        | 'monitor-export-csv'
      readonly title: string
      readonly buffer: string
      readonly meta?: Record<string, string>
    }
  | {
      readonly kind: 'multi'
      readonly intent: 'create-template-content' | 'edit-template-content' | 'run-inline-entries'
      readonly title: string
      readonly buffer: string
      readonly meta?: Record<string, string>
    }

export const useInputMode = () => {
  const [inputMode, setInputMode] = useState<InputMode>({ kind: 'none' })
  const [pendingTemplateName, setPendingTemplateName] = useState('')

  const openSingle = (
    intent: Extract<InputMode, { kind: 'single' }>['intent'],
    title: string,
    buffer = '',
    meta?: Record<string, string>,
  ): void => {
    setInputMode({ kind: 'single', intent, title, buffer, meta })
  }

  const openMulti = (
    intent: Extract<InputMode, { kind: 'multi' }>['intent'],
    title: string,
    buffer = '',
    meta?: Record<string, string>,
  ): void => {
    setInputMode({ kind: 'multi', intent, title, buffer, meta })
  }

  const cancel = (): void => {
    setInputMode({ kind: 'none' })
  }

  const updateBuffer = (updater: (buffer: string) => string): void => {
    setInputMode((current) => {
      if (current.kind === 'none') return current
      return { ...current, buffer: updater(current.buffer) }
    })
  }

  return {
    inputMode,
    pendingTemplateName,
    setPendingTemplateName,
    openSingle,
    openMulti,
    cancel,
    setInputMode,
    updateBuffer,
  } as const
}
