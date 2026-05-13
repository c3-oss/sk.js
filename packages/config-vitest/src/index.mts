import { type ViteUserConfig, defineConfig } from 'vitest/config'

/**
 * Builds coverage exclusion globs for filenames that may appear at any package depth.
 *
 * @param filenames - Basenames or glob fragments to match below the package root.
 * @returns Glob patterns scoped to TypeScript-like files.
 */
const nestedFilesGlob = (...filenames: string[]): string[] => filenames.map((f) => `**/**/${f}.+(ts|cts|mts)`)

/**
 * Shared Vitest configuration for workspace packages.
 *
 * Enables empty test suites, v8 coverage, and coverage exclusions for generated,
 * configuration, DTO, interface, and test-only files.
 */
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
