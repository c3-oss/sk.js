/**
 * Parsed command-line options for the FIM banner CLI.
 */
export interface FIMArgs {
  /** Text rendered as a FIGlet banner. */
  text: string
  /** FIGlet font name used to render the banner. */
  font: string
  /** Chalk style expression applied to the rendered banner. */
  style: string
  /** Number of spaces prepended to each rendered banner line. */
  indent: number
  /** Whether to print all available FIGlet fonts. */
  list: boolean
  /** Whether to render the text with every available FIGlet font. */
  showcase: boolean
  /** Whether to print the generated usage guide. */
  help?: boolean
}
