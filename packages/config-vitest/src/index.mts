import { defineConfig, type ViteUserConfig } from 'vitest/config'

const nestedFilesGlob = (...filenames: string[]): string[] => filenames.map((f) => `**/**/${f}.+(ts|cts|mts)`)

export const vitestConfig = defineConfig({
  test: {
    coverage: {
      all: true,
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '*.cjs',
        '*.js',
        '*.mjs',
        'dist/**',
        'docs/**',
        ...nestedFilesGlob('*.config', '*.interface', '*.dto', '*.spec', '*.test', 'inactive*', 'index'),
      ],
    },
  },
}) satisfies ViteUserConfig
