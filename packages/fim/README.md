# @c3-oss/fim

## Description

> fim - Figlet IMproved, display large banners of text with customizations

## Examples

```bash
$ npx fim --text lorem --font Basic
$ npx fim -t ipsum --indent 8
$ npx fim -t sit --style italic.blue
$ npx fim -t dolor -f Gothic -i 4 -s bold.red
$ npx fim -t "Long quoted text"
$ npx fim -t amet --showcase
$ npx fim --list
```

## Options

| Option                  | Description
| ----------------------  | -----------------------------------------------------
| `-t`, `--text string`   | The text to display
| `-f`, `--font string`   | What font to use
| `-s`, `--style string`  | What style to use
| `-i`, `--indent number` | Amount of spaces to indent the banner
| `--list`                | Lists all available fonts
| `--showcase`            | Showcase all available fonts using the received text
| `-h`, `--help`          | Prints this usage guide
