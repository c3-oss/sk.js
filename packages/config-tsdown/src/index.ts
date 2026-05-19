import { defineConfig } from 'tsdown'

/**
 * Base tsdown configuration for packages that emit both CommonJS and ESM builds
 * with generated declaration files.
 */
export const configBase = defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  platform: 'node',
  target: 'es2020',
  deps: {
    skipNodeModulesBundle: true,
  },
})

/**
 * Production tsdown configuration that minifies the base build.
 */
export const configMinified = defineConfig({
  ...configBase,
  minify: true,
})

/**
 * Default shared tsdown configuration for publishable packages.
 */
export default configMinified
