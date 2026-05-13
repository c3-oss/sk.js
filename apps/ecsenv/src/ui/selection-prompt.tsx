import { Box, Text, render, useInput } from 'ink'
import type { ReactElement } from 'react'
import { useMemo, useState } from 'react'

/**
 * Selectable value shown by the Ink prompt.
 */
export interface SelectOption {
  /** Value returned when the option is selected. */
  readonly value: string
  /** Label displayed in the prompt. */
  readonly label: string
}

/**
 * Props used by the internal Ink selection prompt component.
 */
interface SelectionPromptProps {
  readonly title: string
  readonly options: readonly SelectOption[]
  readonly onSelect: (value: string) => void
  readonly onCancel: () => void
}

const MAX_VISIBLE_ITEMS = 15

/**
 * Ink component that renders a searchable single-select prompt.
 */
const SelectionPrompt = ({ title, options, onSelect, onCancel }: SelectionPromptProps): ReactElement => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (search.length === 0) {
      return options
    }
    const lower = search.toLowerCase()
    return options.filter((option) => option.label.toLowerCase().includes(lower))
  }, [options, search])

  const windowStart = useMemo(() => {
    if (filtered.length <= MAX_VISIBLE_ITEMS) {
      return 0
    }
    const half = Math.floor(MAX_VISIBLE_ITEMS / 2)
    const start = selectedIndex - half
    const maxStart = filtered.length - MAX_VISIBLE_ITEMS
    return Math.max(0, Math.min(start, maxStart))
  }, [filtered.length, selectedIndex])

  const visibleItems = filtered.slice(windowStart, windowStart + MAX_VISIBLE_ITEMS)

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) {
      onCancel()
      return
    }

    if (key.upArrow) {
      setSelectedIndex((previous) => (previous - 1 + filtered.length) % filtered.length)
      return
    }

    if (key.downArrow) {
      setSelectedIndex((previous) => (previous + 1) % filtered.length)
      return
    }

    if (key.return) {
      const selected = filtered[selectedIndex]
      if (selected) {
        onSelect(selected.value)
      }
      return
    }

    if (key.backspace || key.delete) {
      setSearch((previous) => previous.slice(0, -1))
      setSelectedIndex(0)
      return
    }

    if (input && !key.ctrl && !key.meta) {
      setSearch((previous) => previous + input)
      setSelectedIndex(0)
    }
  })

  return (
    <Box flexDirection="column">
      <Text>{title}</Text>
      <Text dimColor>Type to filter. Up/down + Enter to select. Esc to cancel.</Text>
      <Text>
        <Text color="cyan">{'> '}</Text>
        <Text>{search.length > 0 ? search : <Text dimColor>search...</Text>}</Text>
      </Text>
      {filtered.length === 0 ? (
        <Text dimColor>No matches</Text>
      ) : (
        <>
          {windowStart > 0 && <Text dimColor> {'...'}</Text>}
          {visibleItems.map((option, visibleIndex) => {
            const absoluteIndex = windowStart + visibleIndex
            const isSelected = absoluteIndex === selectedIndex
            return (
              <Text key={option.value}>
                {isSelected ? <Text color="green">{'>'}</Text> : ' '} {option.label}
              </Text>
            )
          })}
          {windowStart + MAX_VISIBLE_ITEMS < filtered.length && <Text dimColor> {'...'}</Text>}
          <Text dimColor>
            {filtered.length} of {options.length}
            {search.length > 0 ? ` (filter: "${search}")` : ''}
          </Text>
        </>
      )}
    </Box>
  )
}

/**
 * Opens an interactive searchable prompt and resolves with the selected option value.
 */
export const selectOption = async (title: string, options: readonly SelectOption[]): Promise<string | undefined> => {
  if (options.length === 0) {
    return undefined
  }

  return await new Promise((resolve) => {
    const { unmount } = render(
      <SelectionPrompt
        title={title}
        options={options}
        onCancel={() => {
          unmount()
          resolve(undefined)
        }}
        onSelect={(selectedValue) => {
          unmount()
          resolve(selectedValue)
        }}
      />,
    )
  })
}
