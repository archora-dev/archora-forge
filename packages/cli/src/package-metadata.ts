import { createRequire } from 'node:module'

type PackageJson = {
  version?: string
}

const require = createRequire(import.meta.url)
const packageJson = require('../package.json') as PackageJson

export const cliVersion = packageJson.version ?? '1.0.0'
