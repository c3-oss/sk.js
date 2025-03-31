const prettierRules = require('./fragments/rules/prettier')
const standardRules = require('./fragments/rules/standard')
const ignorePatterns = require('./fragments/ignore-patterns')
const nodeEnv = require('./fragments/node-env')

module.exports = {
  plugins: ['prettier'],
  extends: ['airbnb-base', 'plugin:prettier/recommended'],
  rules: {
    ...standardRules,
    ...prettierRules,
    'import/prefer-default-export': 'off'
  },
  overrides: [
    {
      files: ['*.js?(x)']
    }
  ],
  ...nodeEnv,
  ...ignorePatterns
}
