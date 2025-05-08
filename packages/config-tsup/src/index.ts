import { defineConfig } from 'tsup'

export const configBase = defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  silent: true,
})

export const configMinified = defineConfig({
  ...configBase,
  minify: 'terser',
  terserOptions: {
    compress: {
      ecma: 2020,
      passes: 3,
    },
    format: {
      ecma: 2020,
      comments: false,
    },
  },
})

export default configMinified
