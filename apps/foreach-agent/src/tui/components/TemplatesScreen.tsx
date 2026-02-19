import { Box, Text } from 'ink'
// biome-ignore lint/style/useImportType: required by SWC JSX runtime used in dev mode
import React from 'react'

import type { TemplateFile } from '../../dtos/types.js'
import { extractTemplateVariables } from '../../services/template-engine.js'

interface TemplatesScreenProps {
  readonly templates: readonly TemplateFile[]
  readonly selectedIndex: number
}

const TemplatesScreen: React.FC<TemplatesScreenProps> = ({ templates, selectedIndex }) => {
  const selectedTemplate = templates[selectedIndex] ?? null
  const vars = selectedTemplate === null ? [] : extractTemplateVariables(selectedTemplate.content)

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        foreach-agent | templates
      </Text>
      <Text dimColor>{`Storage: ~/.foreach-agent/templates (${templates.length} template(s))`}</Text>
      <Text dimColor>{'─'.repeat(100)}</Text>
      {templates.length === 0 ? (
        <Text color="yellow">No templates found. Press n to create one.</Text>
      ) : (
        templates.map((template, index) => {
          const isSelected = index === selectedIndex
          return (
            <Text key={template.id} color={isSelected ? 'cyan' : undefined}>
              {isSelected ? '>' : ' '} {template.name} | updated {new Date(template.updatedAt).toLocaleString()}
            </Text>
          )
        })
      )}
      <Text dimColor>{'─'.repeat(100)}</Text>
      {selectedTemplate !== null && (
        <Box flexDirection="column">
          <Text>
            Selected: <Text color="green">{selectedTemplate.name}</Text>
          </Text>
          <Text>Variables: {vars.length === 0 ? '-' : vars.join(', ')}</Text>
          <Text dimColor>Preview:</Text>
          {selectedTemplate.content
            .split('\n')
            .slice(0, 6)
            .map((line, index) => (
              <Text key={`${index}-${line}`}>{line}</Text>
            ))}
        </Box>
      )}
      <Text dimColor>{'─'.repeat(100)}</Text>
      <Text dimColor>j/k move | n new | e edit | d delete | r run setup | u runs | R refresh | q quit</Text>
    </Box>
  )
}

export default TemplatesScreen
