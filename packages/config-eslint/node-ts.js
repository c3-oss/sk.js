const { resolve } = require('node:path')

const standardRules = require('./fragments/rules/standard')
const ignorePatterns = require('./fragments/ignore-patterns')
const nodeEnv = require('./fragments/node-env')

const project = resolve(process.cwd(), 'tsconfig.json')

module.exports = {
  plugins: ['@typescript-eslint'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'airbnb-base',
    'airbnb-typescript/base'
  ],
  settings: {
    'import/resolver': {
      typescript: {
        project
      }
    }
  },
  rules: {
    ...standardRules,
    'consistent-return': 'off',
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'interface',
        format: ['PascalCase'],
        custom: {
          regex: '^[A-Z]',
          match: true
        }
      }
    ],
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: false
      }
    ],
    'import/prefer-default-export': 'off'
  },
  overrides: [
    {
      files: ['*.js?(x)', '*.ts?(x)']
    }
  ],
  ...nodeEnv,
  ...ignorePatterns
}
