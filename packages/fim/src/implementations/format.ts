/* eslint-disable prettier/prettier */

// 3rd-party
import chalk from 'chalk'

export const indentBanner =
  (indentLevel: number) =>
    (banner: string): string =>
      indentLevel === 0
        ? banner
        : banner
            .split('\n')
            .map(line => ' '.repeat(indentLevel) + line)
            .join('\n')

export const colorizeBanner =
  (style: string) =>
    (banner: string): string =>
      style.trim().length === 0
        ? banner
        : chalk`{${style} ${banner}}`
