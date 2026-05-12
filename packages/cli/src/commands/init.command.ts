import type { CAC } from 'cac'
import { access, writeFile } from 'node:fs/promises'

import { logger } from '../ui/logger.js'

export function registerInitCommand(cli: CAC): void {
  cli.command('init', 'Create an archora-forge.config.ts file').action(async () => {
    const filePath = 'archora-forge.config.ts'
    if (await fileExists(filePath)) {
      logger.warn(`${filePath} already exists`)
      return
    }

    await writeFile(filePath, createConfigTemplate(), 'utf8')
    logger.success(`Created ${filePath}`)
  })
}

async function fileExists(filePath: string): Promise<boolean> {
  return access(filePath)
    .then(() => true)
    .catch(() => false)
}

function createConfigTemplate(): string {
  return `import { defineForgeConfig } from '@archora/forge-config'\n\nexport default defineForgeConfig({\n  input: './openapi.yaml',\n  output: {\n    root: './src',\n    generatedDir: './src/shared/api/generated',\n    featuresDir: './src/features',\n    pagesDir: './src/pages',\n    mocksDir: './src/shared/mocks',\n  },\n  target: {\n    framework: 'vue',\n    language: 'typescript',\n    query: 'tanstack-vue-query',\n    ui: 'archora-ui',\n    architecture: 'feature-sliced',\n  },\n})\n`
}
