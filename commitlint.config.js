const fs = require('fs')

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'workspace',
        ...fs.readdirSync('packages')
      ]
    ],
    'scope-empty': [2, 'never']
  }
}
