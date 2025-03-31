#!/usr/bin/env node

// standard
import util from 'util'

// 3rd-party
import chalk from 'chalk'
import figlet, { type Fonts } from 'figlet'

// internal
import { type FIMArgs } from './dtos/fim-args.dto.js'

import cli from './implementations/cli.js'
import { indentBanner, colorizeBanner } from './implementations/format.js'
import { flow } from './implementations/misc.js'

/* ---------------------------------------------------------------------------------------------- */

const tryParsingArgs = (): FIMArgs => {
  try {
    return cli.parse()
  } catch (e) {
    return cli.die(e)
  }
}

const main = (): void => {
  const { text, font, list, style, indent, showcase } = tryParsingArgs()

  /* ... */

  if (list) {
    return cli.bye(figlet.fontsSync().join('\n'))
  }

  /* ... */

  if (text.length === 0) {
    return cli.die("Parameter '--text/-t' cannot be empty")
  }

  /* ... */

  const availableFonts = figlet.fontsSync() as string[]
  if (!availableFonts.includes(font)) {
    return cli.die(util.format("Font '%s' not found", font))
  }

  /* ... */

  if (!showcase) {
    const banner = figlet.textSync(text, font as Fonts)
    const applyFormatting = flow(indentBanner(indent), colorizeBanner(style))

    return cli.bye(applyFormatting(banner))
  }

  /* ... */

  const applyShowcaseFormatting = flow(indentBanner(6), colorizeBanner('bold.cyan'))

  const sc = availableFonts
    .map(f => {
      const m = util.format(" ~~~~ Font '%s':", f)
      const t = chalk.gray(m)
      const b = figlet.textSync(text, f as Fonts)

      return [t, '', applyShowcaseFormatting(b), '', '']
    })
    .flat()
    .join('\n')

  return cli.bye(sc)
}

try {
  main()
} catch (e) {
  cli.die(e)
}
