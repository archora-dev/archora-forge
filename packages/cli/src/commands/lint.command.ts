import type { CAC } from 'cac'
import { lintOpenApi, normalizeOpenApi, parseOpenApi } from '@archora/forge-core'

import { loadCliConfigSet, type CliConfigResult } from '../config.js'
import type { SchemaRequestCliOptions } from '../schema-request.js'
import { writeReportFile } from '../report-file.js'
import { logger } from '../ui/logger.js'

type LintOptions = {
  config?: string
  json?: boolean
  reportFile?: string
  strict?: boolean
} & SchemaRequestCliOptions

export function registerLintCommand(cli: CAC): void {
  cli.command('lint [schema]', 'Lint an OpenAPI schema for frontend generation readiness')
    .option('--config <path>', 'Use a specific Archora Forge config file')
    .option('--schema-header <header>', 'Add a remote schema request header as "name:value" or "name=value"')
    .option('--json', 'Print machine-readable JSON')
    .option('--report-file <path>', 'Write the lint JSON report to a file')
    .option('--strict', 'Exit with failure when diagnostics are present')
    .action(async (schema: string | undefined, options: LintOptions) => {
      const schemas = await Promise.all((await loadCliConfigSet(schema, options)).map((loaded) => createLintEntry(loaded, options)))
      const primary = schemas[0]
      if (!primary) throw new Error('No OpenAPI schema inputs were resolved.')
      const diagnostics = schemas.flatMap((entry) => entry.diagnostics)
      const ok = schemas.every((entry) => entry.ok)
      const payload = {
        ok,
        schema: primary.schema,
        configPath: primary.configPath,
        schemas,
        score: Math.min(...schemas.map((entry) => entry.score)),
        diagnostics,
      }

      if (options.reportFile) {
        const reportPath = await writeReportFile(options.reportFile, JSON.stringify(payload, null, 2))
        console.log(`Report written: ${reportPath}`)
        process.exitCode = ok ? 0 : 1
        return
      }

      if (options.json) {
        console.log(JSON.stringify(payload, null, 2))
      } else {
        logger.title()
        logger.line(schemas.length === 1 ? `Schema: ${primary.schema}` : `Schemas: ${schemas.length}`)
        logger.line(`Frontend readiness score: ${payload.score}/100`)
        logger.line(`Diagnostics: ${diagnostics.length}`)
        for (const diagnostic of diagnostics.slice(0, 30)) {
          logger.warn(`${diagnostic.code}: ${diagnostic.message}${diagnostic.suggestion ? ` Suggestion: ${diagnostic.suggestion}` : ''}`)
        }
      }

      process.exitCode = ok ? 0 : 1
    })
}

async function createLintEntry(loaded: CliConfigResult, options: LintOptions) {
  const document = await parseOpenApi(loaded.schema, loaded.config.schemaRequest)
  const report = lintOpenApi(normalizeOpenApi(document), { strict: options.strict })

  return {
    name: loaded.name ?? 'default',
    schema: loaded.schema,
    configPath: loaded.configPath,
    diagnosticsCount: report.diagnostics.length,
    ...report,
  }
}
