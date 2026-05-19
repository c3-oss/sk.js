#!/usr/bin/env bun
import { main } from './main.js'

void main().catch((errorValue) => {
  const message = errorValue instanceof Error ? errorValue.message : String(errorValue)
  console.error(message)
  process.exit(1)
})
