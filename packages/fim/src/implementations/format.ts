/* eslint-disable prettier/prettier */

// 3rd-party
import chalk from 'chalk'

/**
 * Creates a formatter that prefixes every banner line with a fixed number of spaces.
 *
 * @param indentLevel - Number of spaces to prepend to each line.
 * @returns A banner formatter that preserves unindented output when the level is zero.
 */
export const indentBanner =
  (indentLevel: number) =>
  (banner: string): string =>
    indentLevel === 0
      ? banner
      : banner
          .split('\n')
          .map((line) => ' '.repeat(indentLevel) + line)
          .join('\n')

/**
 * Creates a formatter that applies a Chalk template style to the full banner.
 *
 * @param style - Chalk style expression, such as `bold.red`.
 * @returns A banner formatter that returns the original text when no style is provided.
 */
export const colorizeBanner =
  (style: string) =>
  (banner: string): string =>
    style.trim().length === 0 ? banner : chalk`{${style} ${banner}}`
