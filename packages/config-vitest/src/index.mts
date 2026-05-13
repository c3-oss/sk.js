import { type ViteUserConfig, defineConfig } from 'vitest/config'

const nestedFilesGlob = (...filenames: string[]): string[] => filenames.map((f) => `**/**/${f}.+(ts|cts|mts)`)

export const vitestConfig = defineConfig({
  test: {
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx,cts,mts}'],
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
