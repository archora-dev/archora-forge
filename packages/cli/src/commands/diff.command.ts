import type { CAC } from 'cac'
import {
  createGenerationPlan,
  detectResources,
  normalizeOpenApi,
  parseOpenApi,
  summarizeFilePlan,
} from '@archora/forge-core'

import { loadCliConfig } from '../config.js'
import { logger } from '../ui/logger.js'

export function registerDiffCommand(cli: CAC): void {
  cli.command('diff [schema]', 'Show files that would be created, updated or protected')
    .option('--config <path>', 'Use a specific Archora Forge config file')
    .action(async (schema: string | undefined, options: { config?: string }) => {
    const loaded = await loadCliConfig(schema, options)
    const document = await parseOpenApi(loaded.schema, loaded.config.schemaRequest)
    const normalized = normalizeOpenApi(document)
    const resources = detectResources(normalized.operations).filter((resource) => loaded.config.resources[resource.name]?.enabled !== false)
    const plan = await createGenerationPlan({
      config: loaded.config,
      normalized,
      resources,
      cwd: loaded.cwd,
    })
    const summary = summarizeFilePlan(plan.files)

    logger.title()
    logger.line(`Schema loaded: ${loaded.schema}`)
    if (loaded.configPath) logger.line(`Config loaded: ${loaded.configPath}`)
    logger.line(`Resources detected: ${resources.length}`)
    logger.line(`Files to create: ${summary.create}`)
    logger.line(`Files to update: ${summary.update}`)
    logger.line(`Protected files: ${summary.protected}`)
  })
}
