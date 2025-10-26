/* eslint-disable no-console */

// standard
import util from 'node:util'

// 3rd-party
import { parse as parseCli } from 'ts-command-line-args'

// internal
import type { FIMArgs } from '../dtos/fim-args.dto.js'
import { errorWrapper } from './misc.js'

const PROGRAM_COMMAND = 'npx fim'

const parse = (): FIMArgs =>
  parseCli<FIMArgs>(
    {
      text: {
        type: String,
        alias: 't',
        description: 'The text to display',
        defaultValue: '',
      },
      font: {
        type: String,
        alias: 'f',
        description: 'What font to use',
        defaultValue: 'Standard',
      },
      style: {
        type: String,
        alias: 's',
        description: 'What style to use',
        defaultValue: '',
      },
      indent: {
        type: Number,
        alias: 'i',
        description: 'Amount of spaces to indent the banner',
        defaultValue: 0,
      },
      list: {
        type: Boolean,
        description: 'Lists all available fonts',
        defaultValue: false,
      },
      showcase: {
        type: Boolean,
        description: 'Showcase all available fonts using the received text',
        defaultValue: false,
      },
      help: {
        type: Boolean,
        optional: true,
        alias: 'h',
        description: 'Prints this usage guide',
      },
    },
    {
      helpArg: 'help',
      headerContentSections: [
        {
          header: 'Description',
          content: 'fim - Figlet IMproved, display large banners of text with customizations',
        },
        {
          header: 'Examples',
          content: [
            '$ %s --text lorem --font Basic',
            '$ %s -t ipsum --indent 8',
            '$ %s -t sit --style italic.blue',
            '$ %s -t dolor -f Gothic -i 4 -s bold.red',
            '$ %s -t "Long quoted text"',
            '$ %s -t amet --showcase',
            '$ %s --list',
          ].map((c) => util.format(c, PROGRAM_COMMAND)),
        },
      ],
    },
  )

const die = (e: unknown): never => {
  const { message } = errorWrapper(typeof e === 'string' ? new Error(e) : e)

  console.error(message)
  console.error("Use '%s --help' to see the manual", PROGRAM_COMMAND)
  process.exit(1)
}

const bye = (message?: string): never => {
  if (message !== undefined) {
    console.log(message)
  }

  process.exit(0)
}

export default { parse, die, bye }
