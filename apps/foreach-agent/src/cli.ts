#!/usr/bin/env bun

import { main } from './main.js'

/** CLI entrypoint that prints top-level errors and exits non-zero. */
void main().catch((errorValue) => {
  const message = errorValue instanceof Error ? errorValue.message : String(errorValue)
  console.error(message)
  process.exit(1)
})
