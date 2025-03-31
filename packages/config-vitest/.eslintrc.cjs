module.exports = {
  extends: ['@c3-oss/config-eslint/node-ts.js'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname
  }
}
