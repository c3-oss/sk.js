# c3-oss/sk.js - Small npm tools for sharp TypeScript work.

sk.js is C3's public TypeScript toolkit: a Bun/Turbo monorepo of focused npm packages for CLIs,
AWS workflows, terminal tooling, shared configs, logging, types, and small reusable utilities.

CLIs - Libraries - Shared configs - Release-ready npm workspaces

The root package is private. The installable units are the individual workspaces under `apps/*` and
`packages/*`, published under the `@c3-oss` npm scope.

## Quick start

Run a CLI without installing it globally:

```bash
npx -y @c3-oss/fim --help
```

Install a runtime library:

```bash
npm install @c3-oss/logger
```

Install shared development configs:

```bash
npm install -D @c3-oss/config-typescript @c3-oss/config-vitest
```

Or install a CLI globally:

```bash
npm install -g @c3-oss/fim
fim --help
```

## What is inside

### CLIs

- `@c3-oss/devbox-check-update` - Check and update Devbox packages in `devbox.json` files.
- `@c3-oss/ecsenv` - Interactive TUI for fetching AWS ECS secrets and environment variables.
- `@c3-oss/foreach-agent` - Run prompt templates across multiple AI coding agents.
- `@c3-oss/pip-check-update` - Check and update Python dependencies in `pyproject.toml` files.
- `@c3-oss/fim` - Display customizable Figlet banners.
- `@c3-oss/prettify-json-logger-messages` - Prettify JSON logger messages.

### Libraries and configs

- `@c3-oss/aws-wrapper-ecs` - Simpler developer experience for AWS ECS.
- `@c3-oss/drizzle-ulid` - Drizzle custom type for ULIDs.
- `@c3-oss/functional` - Functional style utilities.
- `@c3-oss/ink-figlet` - Figlet component for Ink applications.
- `@c3-oss/logger` - Reusable Pino logger.
- `@c3-oss/magic-values` - Shared constants, enums, and magic values.
- `@c3-oss/typeguard` - Type guard utilities.
- `@c3-oss/types` - Generic shared TypeScript types.
- `@c3-oss/config-biome` - Shareable Biome configuration.
- `@c3-oss/config-eslint` - Shareable ESLint configurations.
- `@c3-oss/config-tsdown` - Shareable tsdown configuration.
- `@c3-oss/config-tsup` - Compatibility shim for the former tsup configuration package.
- `@c3-oss/config-typescript` - Shareable TypeScript configuration.
- `@c3-oss/config-vitest` - Shareable Vitest configuration.

## Why this repo exists

C3 projects tend to need the same small pieces of tooling: package update helpers, terminal utilities,
AWS wrappers, typed logging, shared TypeScript settings, and test/build/lint configs. sk.js keeps those
pieces in one workspace so they can share conventions while still shipping as independent npm packages.

The goal is to keep each package narrow, scriptable, and useful on its own.

## Development

Install dependencies:

```bash
bun install
```

Run the full monorepo checks:

```bash
bun run build-all
bun run lint-all
bun run test-all
```

Target one workspace:

```bash
bun run turbo run test --filter=@c3-oss/logger
bun --filter @c3-oss/foreach-agent start
```

## Releases

Package releases are managed with Changesets. Add a changeset for publishable package changes:

```bash
bun changeset
```

Each package is versioned and published independently under `@c3-oss/*`.

## Package docs

Detailed usage lives in the package-level READMEs. Start there for CLI options, examples, and package-specific
API notes.
