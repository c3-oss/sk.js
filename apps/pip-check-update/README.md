# @c3-oss/pip-check-update

## Description

> Check and update Python dependencies in `pyproject.toml` files.

## Examples

```bash
$ npx pip-check-update ./pyproject.toml
$ npx pip-check-update /path/to/pyproject.toml --dry-run
$ npx pip-check-update pyproject.toml --break-major
$ npx pip-check-update pyproject.toml --skip-lock-sync
```

## Options

| Option               | Description                                      |
| -------------------- | ------------------------------------------------ |
| `-d`, `--dry-run`    | Only check, do not modify file                   |
| `-s`, `--skip-lock-sync` | Skip running `uv sync` / `poetry lock` after update |
| `-b`, `--break-major` | Allow major version bumps                        |
| `-h`, `--help`       | Prints this usage guide                          |
