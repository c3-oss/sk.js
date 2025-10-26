// @ts-expect-error ...
import React from 'react'

import figlet, { type Fonts as FigletFonts } from 'figlet'
import { Text } from 'ink'
import { useEffect, useState } from 'react'

import type { Fonts } from './fonts.js'

/**
 * Props for the Figlet component.
 * Defines the configuration for rendering ASCII art text.
 */
export type FigletProps = {
  /** The FIGlet font to use for rendering the text */
  font: Fonts
  /** The text content to convert to ASCII art */
  text: string
  /** Optional maximum width for the rendered text (in characters) */
  width?: number
}

/**
 * React component that renders text as ASCII art using FIGlet fonts.
 * This component is designed for use with Ink (React for CLIs) and provides
 * a convenient way to display large, stylized text in terminal applications.
 *
 * The component renders synchronously using figlet.textSync() and updates
 * reactively when props change.
 *
 * @param props - The component props defining font, text, and optional width
 * @returns A React element containing the ASCII art text
 */
export function Figlet({ font, text, width }: FigletProps) {
  const [banner, setBanner] = useState('')

  useEffect(() => {
    const options = { width, font: font as FigletFonts }
    const banner = figlet.textSync(text, options)

    setBanner(banner)
  }, [text, width, font])

  return <Text>{banner}</Text>
}
