# foreach-agent

Run Liquid templates in batch across AI coding agent CLIs (`claude`, `cursor-agent`, `gemini`, `codex`), with:

- interactive TUI mode
- headless CLI mode
- programmatic API usage

## Storage

All data is persisted under `~/.foreach-agent/`:

- `templates/`: editable templates
- `runs/<runId>/run.json`: consolidated run state
- `runs/<runId>/prompts/*.md`: rendered prompt per task
- `runs/<runId>/transcripts/*.jsonl`: raw transcript per task
- `exports/`: run exports (JSON/CSV)

## Run

Interactive mode (default):

```bash
cd apps/foreach-agent
bun start
```

or:

```bash
bun start tui
```

Build:

```bash
bun --filter @c3-oss/foreach-agent build
```

## Headless CLI

Main commands:

```bash
bun start run --template my-template.liquid --entries '[{"name":"world"}]'
bun start templates list --output-format table
bun start runs --query 'status == "failed"'
bun start tasks --run-id <runId> --query 'provider == "codex" and hasError'
bun start configs --query 'concurrency >= 10 and autoApproval'
bun start export --run-id <runId> --format csv --output /tmp/run.csv
```

### `--output-format` (tfplan-explorer style)

Supported values:

- `interactive`
- `table`
- `json`
- `csv`

Defaults:

- `templates list`, `runs`, `tasks`, `configs`: `interactive`
- `run`, `templates create/read/update/delete`: `table`

Note:

- `--query` requires non-interactive output (`table`, `json`, or `csv`)

Examples:

```bash
bun start runs --output-format interactive
bun start runs --output-format table
bun start runs --output-format json --query 'failedTasks > 0'
bun start templates list --output-format csv
```

### Template CRUD subcommands

Create:

```bash
bun start templates create --name my-template --content 'Hello {{ name }}'
```

Read:

```bash
bun start templates read --id my-template.liquid --output-format json
```

Update:

```bash
bun start templates update --id my-template.liquid --content 'Hi {{ name }}'
```

Delete:

```bash
bun start templates delete --id my-template.liquid
```

Content input for create/update:

- `--content` (inline)
- `--content-path` (file path)
- `--content-stdin` (stdin)

### Run without TUI

```bash
bun start run \
  --template my-template.liquid \
  --entries-path /abs/path/entries.yaml \
  --providers 'claude,codex' \
  --codex-model gpt-5.3-codex \
  --concurrency 10 \
  --retries 3 \
  --timeout-seconds infinite \
  --cwd /abs/path/project \
  --auto-approval true
```

Entries input options:

- `--entries` (inline JSON/YAML)
- `--entries-path` (JSON/YAML file)
- `--entries-stdin` (stdin)

## `--query` (Filtrex)

`--query` follows the same model used in `mzi-tfplan-explorer` via `filtrex`.

Examples:

```bash
bun start runs --query 'failedTasks > 0'
bun start templates list --query 'variablesCount >= 3 and content ~= "TODO"'
bun start tasks --run-id <runId> --query 'provider == "codex" and status != "success"'
bun start configs --query 'timeoutSeconds == -1 and autoApproval'
```

Available query fields:

- `templates`: `id`, `name`, `filePath`, `updatedAt`, `updatedAtEpoch`, `content`, `contentLength`, `variablesCount`
- `runs`: `id`, `status`, `templateName`, `templateId`, `providers`, `providerCount`, `entryCount`, `taskCount`, `successTasks`, `failedTasks`, `concurrency`, `retries`, `timeoutSeconds`, `autoApproval`, `cwd`, `createdAt`, `startedAt`, `finishedAt`
- `tasks`: `id`, `runId`, `status`, `provider`, `model`, `entryIndex`, `attempt`, `maxAttempts`, `durationMs`, `hasError`, `hasOutput`, `errorMessage`, `outputText`, `templateName`, `concurrency`, `retries`, `autoApproval`, `cwd`
- `configs`: `runId`, `runStatus`, `templateName`, `templateId`, `providerCount`, `providers`, `entryCount`, `concurrency`, `retries`, `timeoutSeconds`, `autoApproval`, `cwd`, `createdAt`

## Programmatic usage

```ts
import { executeHeadlessRun, filterWithQuery } from '@c3-oss/foreach-agent'

const run = await executeHeadlessRun({
  template: 'my-template.liquid',
  entriesText: '[{"name":"world"}]',
  providers: ['codex'],
})

const failedTasks = filterWithQuery(
  run.tasks,
  'status != "success"',
  (task) => ({ status: task.status, provider: task.provider }),
  (task) => task.id,
)
```

## Main TUI shortcuts

Templates screen:

- `j/k`: navigate
- `n`: create template
- `e`: edit template
- `d`: delete template
- `r`: open run setup
- `u`: open runs history
- `q`: quit

Run setup screen:

- `j/k`: navigate fields
- `space`: toggle provider/boolean/source
- `enter`: edit selected field
- `enter` on `start run`: start execution

Run monitor screen:

- `j/k`: navigate tasks
- `enter`: open pretty logs
- `s`: status filter
- `p`: provider filter
- `/`: text filter
- `x`: export JSON
- `X`: export CSV

Multi-line editor:

- `Ctrl+S`: save
- `Ctrl+L`: clear
- `Esc`: cancel

## Notes

- Template engine: `liquidjs`
- Entries accept JSON/YAML inline or file path
- Default concurrency: `10`
- Default retries: `3` attempts per task
- Default timeout: infinite (minimum configurable value: `20s`)
- Default auto-approval: enabled
- Default `codex` model: `gpt-5.3-codex`
  - `gpt-codex-5.3` was tested and did not work in this environment
