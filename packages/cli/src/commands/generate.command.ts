import type { CAC } from 'cac'
import {
  createGenerationPlan,
  collectDiagnostics,
  detectResources,
  normalizeOpenApi,
  parseOpenApi,
  summarizeFilePlan,
  writeGeneratedFiles,
} from '@archora/forge-core'

import { loadCliConfig } from '../config.js'
import { logger } from '../ui/logger.js'

type GenerateOptions = {
  force?: boolean
  dryRun?: boolean
  config?: string
}

export function registerGenerateCommand(cli: CAC): void {
  cli
    .command('generate <schema>', 'Generate frontend modules from an OpenAPI schema')
    .option('--force', 'Overwrite protected custom files')
    .option('--dry-run', 'Print planned changes without writing files')
    .option('--config <path>', 'Use a specific Archora Forge config file')
    .action(async (schema: string, options: GenerateOptions) => {
      const loaded = await loadCliConfig(schema, options)
      const document = await parseOpenApi(loaded.schema, loaded.config.schemaRequest)
      const normalized = normalizeOpenApi(document)
      const resources = detectResources(normalized.operations).filter((resource) => loaded.config.resources[resource.name]?.enabled !== false)
      const diagnostics = collectDiagnostics(normalized)
      const plan = await createGenerationPlan({
        config: loaded.config,
        normalized,
        resources,
        cwd: loaded.cwd,
      })
      const summary = summarizeFilePlan(plan.files)
      const result = await writeGeneratedFiles(plan.files, {
        cwd: loaded.cwd,
        dryRun: options.dryRun ?? false,
      })

      logger.title()
      logger.line(`Schema loaded: ${loaded.schema}`)
      if (loaded.configPath) logger.line(`Config loaded: ${loaded.configPath}`)
      logger.line(`Resources detected: ${resources.length}`)
      logger.line(`Diagnostics: ${diagnostics.length}`)
      for (const diagnostic of diagnostics.slice(0, 10)) {
        logger.warn(`${diagnostic.code}: ${diagnostic.message}`)
      }
      logger.line(`Files to create: ${summary.create}`)
      logger.line(`Files to update: ${summary.update}`)
      logger.line(`Protected files: ${summary.protected}`)
      logger.line('')
      logger.success(options.dryRun ? 'Dry run complete' : 'Generation complete')
      logger.line(`Created: ${result.created}`)
      logger.line(`Updated: ${result.updated}`)
      logger.line(`Protected: ${result.protected}`)
    })
}
