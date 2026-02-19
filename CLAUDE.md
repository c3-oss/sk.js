# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**C3 OSS SwissKnife** (`@c3-oss/swissknife`) is a pnpm monorepo containing open-source TypeScript utility packages and shareable configurations.

- **Repository:** https://github.com/c3-oss/sk.js
- **Package Manager:** pnpm 10.8.1
- **Node Version:** >=22
- **Build System:** Turborepo v2.5.8
- **Task Runner:** [Just](https://just.systems) — run `just` to see all commands

## Monorepo Structure

```
packages/
├── config-biome/                    # Shareable Biome linter/formatter config
├── config-eslint/                   # ESLint configurations for Node.js + TypeScript
├── config-tsup/                     # Tsup bundler configurations (base + minified)
├── config-typescript/               # Base and library TypeScript configs
├── config-vitest/                   # Vitest test framework configuration
├── aws-wrapper-ecs/                 # AWS ECS wrapper for simpler DX
├── drizzle-ulid/                    # Drizzle custom type for ULIDs
├── fim/                             # CLI tool for ASCII art banners (Figlet IMproved)
├── functional/                      # fp-ts wrappers: Either, Failable, error handling
├── ink-figlet/                      # Figlet component for Ink (React TUI)
├── logger/                          # Pino-based logger with transport config
├── magic-values/                    # Zod schemas for LogLevel, NodeEnv enums
├── prettify-json-logger-messages/   # JSON log colorizer CLI
├── typeguard/                       # Runtime type guard utilities + errorWrapper
└── types/                           # Generic TypeScript utility types

apps/
├── ecsenv/                          # Interactive TUI for injecting AWS ECS secrets/env vars
└── foreach-agent/                   # TUI to run prompt templates across AI coding agents
```

### Package Categories

1. **Configuration Packages** (`config-*`): Shareable configs exported as NPM packages
2. **Utility Libraries** (`types`, `typeguard`, `functional`, `magic-values`, `logger`, `drizzle-ulid`, `ink-figlet`): Reusable TypeScript utilities
3. **CLI Tools** (`fim`, `prettify-json-logger-messages`, `ecsenv`, `foreach-agent`): Executable binaries with DTOs for type-safe argument parsing

## Common Development Commands

### Building

```bash
just build <package-name>        # Build a specific package (e.g., just build fim)
just build-all                   # Build all packages
```

### Linting

```bash
just lint <package-name>         # Lint a specific package
just lint-all                    # Lint all packages
just lint-all-fix                # Auto-fix safe linting issues
just lint-all-fix-unsafe         # Auto-fix including unsafe transformations
```

**This project uses Biome (not ESLint/Prettier) for linting and formatting.**

### Testing

```bash
just test <package-name>         # Test a specific package
just test-all                    # Test all packages
just test-all-coverage           # Test with coverage reports
```

To run tests directly in a package directory:

```bash
cd packages/<package-name>
pnpm test                        # Run tests once
pnpm test:coverage               # Run with coverage
```

### Maintenance

```bash
just clean-all                   # Clean all build artifacts, caches, and turbo logs
just bump-all-deps               # Upgrade all deps (minor + patch only)
just update-code-docs            # Generate TypeDoc documentation
```

## Architecture & Patterns

### Workspace Protocol

Internal dependencies use pnpm's workspace protocol: `"@c3-oss/types": "workspace:^0.1.0"`

### Dual Format Outputs

All library packages export both CommonJS and ESM from `dist/`:
- `index.js` (ESM), `index.cjs` (CJS), `index.d.ts` (declarations)

### Configuration Inheritance

Packages extend shareable configs:
- TypeScript: `"extends": "@c3-oss/config-typescript/lib.json"`
- Biome: `"extends": ["./node_modules/@c3-oss/config-biome/biome.json"]`

### DTO Pattern for CLI Tools

CLI tools define argument interfaces as DTOs in `dtos/` subdirectories (e.g., `fim-args.dto.ts`), used with `ts-command-line-args` for type-safe argument parsing.

### Error Handling

- **errorWrapper** from `@c3-oss/typeguard`: Converts unknown caught errors to proper `Error` objects. Used in CLI tool catch blocks.
- **Functional package** (`@c3-oss/functional`): Provides Either-based error handling via fp-ts wrappers — `FailableValue<T>`, `Failable<T>`, `FailableTagged<T, V>` with helpers `err()`, `ok()`, `isOk()`, `isErr()`, `unwrap()`.

### Inter-package Dependencies

```
@c3-oss/typeguard     → depends on @c3-oss/types
@c3-oss/logger        → depends on @c3-oss/magic-values
@c3-oss/aws-wrapper-ecs → depends on @c3-oss/functional, @c3-oss/logger, @c3-oss/magic-values

All packages depend on:
├── @c3-oss/config-biome (linting)
├── @c3-oss/config-typescript (TypeScript config)
└── @c3-oss/config-tsup (bundling, for libraries)
```

## Code Quality Standards

### Biome Configuration

- **Line Width:** 120 characters
- **Indentation:** 2 spaces
- **Quotes:** Single quotes
- **Semicolons:** As needed (not required)
- **Arrow Parentheses:** Always
- **Import Organization:** Enabled

### Git Hooks (Husky)

- **pre-commit:** Runs `just lint-all` + `gitleaks` secret scanning
- **commit-msg:** Validates conventional commits via commitlint

### Conventional Commits

All commits must follow the conventional commit format with a **required scope**:

```
type(scope): subject

Examples:
feat(fim): add font preview command
fix(typeguard): handle null edge case
chore(workspace): update dependencies
```

Valid scopes: auto-detected from `packages/` and `apps/` directory names, plus static scopes: `workspace`, `infra`, `services`, `docs`.

## Release Workflow

Uses **Changesets** for versioning and publishing. Never manually bump versions in `package.json`.

```bash
just release-plan                # Create a changeset (interactive)
just release-apply               # Apply version bumps from changesets
just release-publish             # Publish packages to NPM registry
just release-prepare-publish     # Full pipeline: build, lint, test, apply changesets
just release-commit              # Git commit for each package release
```

## Development Environment

This project uses **Devbox** (Nix-based) for reproducible environments:

```bash
devbox shell    # Provides Node.js 22, just, gitleaks, jq, shellcheck, and more
```

Shell initialization automatically runs `pnpm install`.

## Important Notes

1. **Biome Over ESLint**: Use Biome commands (`biome check`, `biome format`) instead of ESLint/Prettier. ESLint config package exists but Biome is the primary tool.
2. **Turbo Caching**: If you encounter stale builds, use `just clean-all` to clear all caches.
3. **Workspace Dependencies**: Always use the `workspace:` protocol when adding dependencies between packages.
4. **Package Naming**: All packages are scoped under `@c3-oss/` namespace.
5. **No README Creation**: Individual package READMEs are not required unless explicitly needed for NPM publishing.
