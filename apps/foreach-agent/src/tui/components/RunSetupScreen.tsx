import { Box, Text } from 'ink'
// biome-ignore lint/style/useImportType: required by SWC JSX runtime used in dev mode
import React from 'react'

import type { Provider, TemplateFile } from '../../dtos/types.js'
import { type RunDraft, runSetupFields } from '../hooks/useRunDraft.js'

interface RunSetupScreenProps {
  readonly template: TemplateFile | null
  readonly draft: RunDraft
  readonly fieldIndex: number
}

const RunSetupScreen: React.FC<RunSetupScreenProps> = ({ template, draft, fieldIndex }) => {
  const field = runSetupFields[fieldIndex]

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        foreach-agent | run setup
      </Text>
      <Text dimColor>{template === null ? 'No template selected' : `Template: ${template.name}`}</Text>
      <Text dimColor>{'─'.repeat(100)}</Text>
      {runSetupFields.map((item) => {
        const selected = field === item
        const cursor = selected ? '>' : ' '

        if (item.startsWith('provider:')) {
          const provider = item.replace('provider:', '') as Provider
          const enabled = draft.selectedProviders.includes(provider)
          return (
            <Text key={item} color={selected ? 'cyan' : undefined}>
              {cursor} provider {provider}: {enabled ? '[x]' : '[ ]'} model={draft.providerModels[provider]}
            </Text>
          )
        }

        if (item === 'concurrency') {
          return (
            <Text key={item} color={selected ? 'cyan' : undefined}>
              {cursor} concurrency: {draft.concurrency}
            </Text>
          )
        }

        if (item === 'retries') {
          return (
            <Text key={item} color={selected ? 'cyan' : undefined}>
              {cursor} retries: {draft.retries}
            </Text>
          )
        }

        if (item === 'timeout') {
          return (
            <Text key={item} color={selected ? 'cyan' : undefined}>
              {cursor} timeout: {draft.timeoutSeconds === null ? 'infinite' : `${draft.timeoutSeconds}s`}
            </Text>
          )
        }

        if (item === 'cwd') {
          return (
            <Text key={item} color={selected ? 'cyan' : undefined}>
              {cursor} cwd: {draft.cwd}
            </Text>
          )
        }

        if (item === 'autoApproval') {
          return (
            <Text key={item} color={selected ? 'cyan' : undefined}>
              {cursor} auto approval: {draft.autoApproval ? 'on' : 'off'}
            </Text>
          )
        }

        if (item === 'entrySource') {
          return (
            <Text key={item} color={selected ? 'cyan' : undefined}>
              {cursor} entry source: {draft.entrySource}
            </Text>
          )
        }

        if (item === 'entries') {
          const preview =
            draft.entrySource === 'inline'
              ? `${draft.entriesInline.slice(0, 80)}${draft.entriesInline.length > 80 ? '...' : ''}`
              : draft.entriesPath

          return (
            <Text key={item} color={selected ? 'cyan' : undefined}>
              {cursor} entries: {preview.length === 0 ? '-' : preview}
            </Text>
          )
        }

        if (item === 'start') {
          return (
            <Text key={item} color={selected ? 'green' : undefined}>
              {cursor} start run
            </Text>
          )
        }

        return (
          <Text key={item} color={selected ? 'gray' : undefined}>
            {cursor} back
          </Text>
        )
      })}
      <Text dimColor>{'─'.repeat(100)}</Text>
      <Text dimColor>j/k move | Enter edit/select | Space toggle boolean/provider | Esc back</Text>
    </Box>
  )
}

export default RunSetupScreen
