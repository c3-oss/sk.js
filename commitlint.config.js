const fs = require('fs')
const path = require('path')

const listDirectoriesSync = (dir) => {
  const entries = fs.readdirSync(dir)
  return entries.filter(e => {
    const s = fs.statSync(path.join(dir, e))
    return s.isDirectory()
  })
}

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'workspace',
        'infra',
        'services',
        'docs',
        ...listDirectoriesSync('packages'),
        ...listDirectoriesSync('apps')
      ]
    ],
    'scope-empty': [2, 'never']
  }
}
