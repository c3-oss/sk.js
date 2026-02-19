import { Box, Text } from 'ink'
// biome-ignore lint/style/useImportType: required by SWC JSX runtime used in dev mode
import React from 'react'

interface StatusBarProps {
  readonly message: string
}

const StatusBar: React.FC<StatusBarProps> = ({ message }) => {
  if (message.length === 0) {
    return null
  }

  return (
    <Box marginTop={1}>
      <Text color="yellow">{message}</Text>
    </Box>
  )
}

export default StatusBar
