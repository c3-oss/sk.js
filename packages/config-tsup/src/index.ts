import { defineConfig } from 'tsup'

/**
 * Base tsup configuration for packages that emit both CommonJS and ESM builds
 * with generated declaration files.
 */
export const configBase = defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  silent: true,
})

/**
 * Production tsup configuration that minifies the base build with terser.
 */
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

/**
 * Default shared tsup configuration for publishable packages.
 */
export default configMinified
