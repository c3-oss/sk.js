import readline from 'node:readline'
import { colorize } from 'json-colorizer'

const rl = readline.createInterface({ input: process.stdin })

rl.on('line', (line: string) => {
  if (line.startsWith('{') && line.endsWith('}')) {
    try {
      const parsed = JSON.parse(line)
      console.log(colorize(parsed, { indent: 2 }))
    } catch {
      console.log(line)
    }
  } else {
    console.log(line)
  }
})
