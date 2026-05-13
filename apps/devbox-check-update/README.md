# @c3-oss/devbox-check-update

## Description

> Check and update Devbox packages in `devbox.json` files.

## Examples

```bash
$ npx devbox-check-update
$ npx devbox-check-update ./devbox.json --dry-run
$ npx devbox-check-update ./project nodejs go
$ npx devbox-check-update --install
```

## Options

| Option              | Description                                      |
| ------------------- | ------------------------------------------------ |
| `-d`, `--dry-run`   | Check changes in a temporary copy                |
| `-i`, `--install`   | Run `devbox update` without `--no-install`       |
| `--all-projects`    | Pass `--all-projects` to `devbox update`         |
| `--sync-lock`       | Pass `--sync-lock` to `devbox update`            |
| `--environment`     | Pass an environment name to `devbox update`      |
| `-q`, `--quiet`     | Suppress logs from `devbox update`               |
| `-h`, `--help`      | Prints this usage guide                          |
