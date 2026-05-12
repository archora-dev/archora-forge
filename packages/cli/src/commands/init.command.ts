import type { CAC } from 'cac'
import { access, writeFile } from 'node:fs/promises'

import { logger } from '../ui/logger.js'

type InitOptions = {
  input?: string
  output?: string
  features?: string
  mocks?: string
  validation?: 'none' | 'zod' | 'valibot'
  force?: boolean
}

export function registerInitCommand(cli: CAC): void {
  cli.command('init', 'Create an archora-forge.config.ts file')
    .option('--input <path>', 'OpenAPI schema path to put in the starter config')
    .option('--output <path>', 'Generated API output directory')
    .option('--features <path>', 'Feature model/API output directory')
    .option('--mocks <path>', 'Mock output directory')
    .option('--validation <mode>', 'Validation mode: none, zod or valibot')
    .option('--force', 'Overwrite an existing archora-forge.config.ts file')
    .action(async (options: InitOptions) => {
      const filePath = 'archora-forge.config.ts'
      if ((await fileExists(filePath)) && !options.force) {
        logger.warn(`${filePath} already exists`)
        logger.line('Use --force to overwrite it.')
        return
      }

      await writeFile(filePath, createConfigTemplate(normalizeInitOptions(options)), 'utf8')
      logger.success(`Created ${filePath}`)
      logger.line(`Next: archora-forge inspect ${options.input ?? './openapi.yaml'}`)
    })
}

async function fileExists(filePath: string): Promise<boolean> {
  return access(filePath)
    .then(() => true)
    .catch(() => false)
}

function normalizeInitOptions(options: InitOptions): Required<Pick<InitOptions, 'input' | 'output' | 'features' | 'mocks' | 'validation'>> {
  const validation = options.validation ?? 'none'
  if (!['none', 'zod', 'valibot'].includes(validation)) {
    throw new Error('Invalid validation mode. Use one of: none, zod, valibot.')
  }

  return {
    input: options.input ?? './openapi.yaml',
    output: options.output ?? './src/shared/api/generated',
    features: options.features ?? './src/features',
    mocks: options.mocks ?? './src/shared/mocks',
    validation,
  }
}

function createConfigTemplate(options: Required<Pick<InitOptions, 'input' | 'output' | 'features' | 'mocks' | 'validation'>>): string {
  return `import { defineForgeConfig } from '@archora/forge-cli'\n\nexport default defineForgeConfig({\n  input: ${quoteConfigValue(options.input)},\n  output: {\n    root: './src',\n    generatedDir: ${quoteConfigValue(options.output)},\n    featuresDir: ${quoteConfigValue(options.features)},\n    pagesDir: './src/pages',\n    mocksDir: ${quoteConfigValue(options.mocks)},\n  },\n  target: {\n    framework: 'neutral',\n    language: 'typescript',\n    query: 'promise',\n    ui: 'metadata',\n    architecture: 'feature-sliced',\n  },\n  validation: ${quoteConfigValue(options.validation)},\n})\n`
}

function quoteConfigValue(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}
