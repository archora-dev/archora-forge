import type { CAC } from 'cac'
import { calculateSchemaHealth, collectDiagnostics, normalizeOpenApi, parseOpenApi } from '@archora/forge-core'

import { loadCliConfig } from '../config.js'
import { logger } from '../ui/logger.js'

export function registerValidateCommand(cli: CAC): void {
  cli.command('validate [schema]', 'Validate an OpenAPI schema and Forge config')
    .option('--config <path>', 'Use a specific Archora Forge config file')
    .option('--strict', 'Exit with failure when diagnostics are present')
    .option('--json', 'Print machine-readable JSON')
    .action(async (schema: string | undefined, options: { config?: string; strict?: boolean; json?: boolean }) => {
    const loaded = await loadCliConfig(schema, options)
    const document = await parseOpenApi(loaded.schema, loaded.config.schemaRequest)
    const normalized = normalizeOpenApi(document)
    const report = calculateSchemaHealth(normalized)
    const diagnostics = collectDiagnostics(normalized)
    if (options.json) {
      console.log(JSON.stringify({ ok: !options.strict || diagnostics.length === 0, schema: loaded.schema, health: report, diagnostics }, null, 2))
    } else {
    logger.title()
    logger.success(`Schema is valid OpenAPI ${document.openapi}`)
    logger.line(`Health score: ${report.score}/100`)
      logger.line(`Diagnostics: ${diagnostics.length}`)
      for (const diagnostic of diagnostics.slice(0, 20)) {
        logger.warn(`${diagnostic.code}: ${diagnostic.message}`)
      }
    }
    if (options.strict && diagnostics.length > 0) {
      process.exitCode = 1
    }
  })
}
