# Repository Guidelines

## Project Structure & Module Organization
This repository is a `pnpm` + Turbo monorepo.

- `apps/`: runnable CLIs/apps (`@c3-oss/ecsenv`, `@c3-oss/foreach-agent`)
- `packages/`: reusable libraries and shared configs (`@c3-oss/*`)
- `docs/`: generated TypeDoc output
- `.changeset/`: versioning/release metadata

Source files live under each workspace `src/`. Tests are usually colocated in `src/__tests__/` or as `src/*.test.ts`.

## Build, Test, and Development Commands
Install dependencies:

```bash
pnpm install
```

Run all packages via Turbo/Just:

```bash
just build-all         # build every workspace package/app
just lint-all          # run Biome checks everywhere
just test-all          # run Vitest suites everywhere
just test-all-coverage # Vitest with coverage reports
```

Target one workspace:

```bash
pnpm turbo run test --filter=@c3-oss/logger
pnpm --filter @c3-oss/foreach-agent start
```

## Coding Style & Naming Conventions
- Language: TypeScript (ESM/NodeNext), strict TS config in shared `@c3-oss/config-typescript`.
- Formatting/linting: Biome (`biome check .`).
- Indentation: 2 spaces for TS/JS/JSON/YAML (`.editorconfig`).
- JavaScript style (Biome): single quotes, line width 120, organize imports enabled.
- Keep package names and scopes aligned with directory names (for example `packages/logger` -> `@c3-oss/logger`).

## Testing Guidelines
- Framework: Vitest (shared config from `@c3-oss/config-vitest`).
- Preferred test names: `*.test.ts` (for example `src/__tests__/table.test.ts`).
- Coverage command: `pnpm turbo run test:coverage` or `just test-all-coverage`.
- Coverage reports are written to each package/app `coverage/` directory.

## Commit & Pull Request Guidelines
- Commits must follow Conventional Commits with a required scope:
  `type(scope): summary`
- Valid scopes include `workspace`, `docs`, and workspace directory names from `apps/*` and `packages/*`.
- Use `pnpm cz` (or `just commit`) to generate compliant commit messages.
- Before opening a PR, run `just lint-all` and `just test-all`.
- Pre-commit hooks run linting and `gitleaks`; do not commit secrets.
- For publishable package changes, add a changeset (`pnpm changeset`).
