import type { CAC } from 'cac'
import { lintOpenApi, normalizeOpenApi, parseOpenApi } from '@archora/forge-core'

import { loadCliConfig } from '../config.js'
import { logger } from '../ui/logger.js'

export function registerLintCommand(cli: CAC): void {
  cli.command('lint [schema]', 'Lint an OpenAPI schema for frontend generation readiness')
    .option('--config <path>', 'Use a specific Archora Forge config file')
    .option('--json', 'Print machine-readable JSON')
    .option('--strict', 'Exit with failure when diagnostics are present')
    .action(async (schema: string | undefined, options: { config?: string; json?: boolean; strict?: boolean }) => {
      const loaded = await loadCliConfig(schema, options)
      const document = await parseOpenApi(loaded.schema, loaded.config.schemaRequest)
      const report = lintOpenApi(normalizeOpenApi(document), { strict: options.strict })

      if (options.json) {
        console.log(JSON.stringify(report, null, 2))
      } else {
        logger.title()
        logger.line(`Schema: ${loaded.schema}`)
        logger.line(`Frontend readiness score: ${report.score}/100`)
        logger.line(`Diagnostics: ${report.diagnostics.length}`)
        for (const diagnostic of report.diagnostics.slice(0, 30)) {
          logger.warn(`${diagnostic.code}: ${diagnostic.message}${diagnostic.suggestion ? ` Suggestion: ${diagnostic.suggestion}` : ''}`)
        }
      }

      process.exitCode = report.ok ? 0 : 1
    })
}
