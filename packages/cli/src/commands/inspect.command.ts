import type { CAC } from 'cac'
import { calculateSchemaHealth, collectDiagnostics, detectResources, normalizeOpenApi, parseOpenApi } from '@archora/forge-core'

import { loadCliConfig } from '../config.js'
import { logger } from '../ui/logger.js'

export function registerInspectCommand(cli: CAC): void {
  cli.command('inspect [schema]', 'Inspect an OpenAPI schema')
    .option('--config <path>', 'Use a specific Archora Forge config file')
    .option('--json', 'Print machine-readable JSON')
    .action(async (schema: string | undefined, options: { config?: string; json?: boolean }) => {
    const loaded = await loadCliConfig(schema, options)
    const document = await parseOpenApi(loaded.schema, loaded.config.schemaRequest)
    const normalized = normalizeOpenApi(document)
    const resources = detectResources(normalized.operations)
    const report = calculateSchemaHealth(normalized)
    const diagnostics = collectDiagnostics(normalized)
    if (options.json) {
      console.log(JSON.stringify({ schema: loaded.schema, resources: resources.length, health: report, diagnostics }, null, 2))
      return
    }

    logger.title()
    logger.line(`Schema loaded: ${loaded.schema}`)
    if (loaded.configPath) logger.line(`Config loaded: ${loaded.configPath}`)
    logger.line(`OpenAPI Health Score: ${report.score}/100`)
    logger.line('')
    logger.line('Detected:')
    logger.line(`- ${report.endpointCount} endpoints`)
    logger.line(`- ${report.schemaCount} schemas`)
    logger.line(`- ${report.tagCount} tags`)
    logger.line(`- ${resources.length} resources`)
    logger.line(`- ${report.crudCandidateCount} CRUD candidates`)
    logger.line(`- ${report.enumCount} enums`)
    logger.line(`- ${diagnostics.length} diagnostics`)
    if (report.warnings.length > 0) {
      logger.line('')
      logger.line('Warnings:')
      for (const warning of report.warnings.slice(0, 20)) {
        logger.warn(`${warning.message}${warning.target ? ` (${warning.target})` : ''}`)
      }
    }
    if (diagnostics.length > 0) {
      logger.line('')
      logger.line('Diagnostics:')
      for (const diagnostic of diagnostics.slice(0, 20)) {
        logger.warn(`${diagnostic.code}: ${diagnostic.message}${diagnostic.suggestion ? ` Suggestion: ${diagnostic.suggestion}` : ''}`)
      }
    }
  })
}
