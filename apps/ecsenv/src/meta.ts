import path from 'node:path'

import fs from 'fs-extra'

export interface PackageJson {
  name: string
  description: string
  version: string
}

const extractNameFromScopedPackage = (name: string): string => {
  if (!name.includes('/')) {
    return name
  }

  const segs = name.split('/')
  return segs[1] ?? segs[0] ?? ''
}

export const rootDirectory = path.resolve(import.meta.dirname, '..')

export const packageJson = JSON.parse(fs.readFileSync(path.join(rootDirectory, 'package.json'), 'utf8')) as PackageJson

export const meta = {
  name: extractNameFromScopedPackage(packageJson.name),
  packageJson,
  rootDirectory,
}

export default meta
