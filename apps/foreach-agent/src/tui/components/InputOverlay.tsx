import { Box, Text } from 'ink'
// biome-ignore lint/style/useImportType: required by SWC JSX runtime used in dev mode
import React from 'react'

import type { InputMode } from '../hooks/useInputMode.js'

interface InputOverlayProps {
  readonly mode: InputMode
}

const InputOverlay: React.FC<InputOverlayProps> = ({ mode }) => {
  if (mode.kind === 'none') {
    return null
  }

  if (mode.kind === 'single') {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} marginTop={1}>
        <Text color="cyan">{mode.title}</Text>
        <Text>{mode.buffer}</Text>
        <Text dimColor>Enter submit | Esc cancel</Text>
      </Box>
    )
  }

  const lines = mode.buffer.split('\n')
  const preview = lines.slice(-16)

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="magenta" paddingX={1} marginTop={1}>
      <Text color="magenta">{mode.title}</Text>
      {preview.map((line, index) => (
        <Text key={`${index}-${line}`}>{line}</Text>
      ))}
      <Text dimColor>Type freely | Enter newline | Ctrl+S save | Ctrl+L clear | Esc cancel</Text>
    </Box>
  )
}

export default InputOverlay
