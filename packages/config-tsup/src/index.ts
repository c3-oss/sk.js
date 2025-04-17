import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  silent: true,
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
