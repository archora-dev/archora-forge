import type { CAC } from 'cac'
import { calculateSchemaHealth, collectDiagnostics, normalizeOpenApi, parseOpenApi } from '@archora/forge-core'

import { loadCliConfigSet, type CliConfigResult } from '../config.js'
import { createHtmlReport } from '../html-report.js'
import type { SchemaRequestCliOptions } from '../schema-request.js'
import { writeReportFile } from '../report-file.js'
import { logger } from '../ui/logger.js'

type ValidateOptions = {
  config?: string
  strict?: boolean
  json?: boolean
  report?: 'json' | 'html'
  reportFile?: string
} & SchemaRequestCliOptions

export function registerValidateCommand(cli: CAC): void {
  cli.command('validate [schema]', 'Validate an OpenAPI schema and Forge config')
    .option('--config <path>', 'Use a specific Archora Forge config file')
    .option('--schema-header <header>', 'Add a remote schema request header as "name:value" or "name=value"')
    .option('--strict', 'Exit with failure when diagnostics are present')
    .option('--json', 'Print machine-readable JSON')
    .option('--report <format>', 'Print a report format: json or html')
    .option('--report-file <path>', 'Write the selected validation report to a file')
    .action(async (schema: string | undefined, options: ValidateOptions) => {
    assertReportFormat(options.report)
    const schemas = await Promise.all((await loadCliConfigSet(schema, options)).map(createValidateEntry))
    const primary = schemas[0]
    if (!primary) throw new Error('No OpenAPI schema inputs were resolved.')
    const diagnostics = schemas.flatMap((entry) => entry.diagnostics)
    const payload = {
      ok: !options.strict || diagnostics.length === 0,
      schema: primary.schema,
      configPath: primary.configPath,
      schemas,
      health: primary.health,
      diagnostics,
    }

    if (options.reportFile) {
      const reportPath = await writeReportFile(options.reportFile, createValidateReport(payload, options))
      console.log(`Report written: ${reportPath}`)
      if (options.strict && diagnostics.length > 0) {
        process.exitCode = 1
      }
      return
    }

    if (options.json || options.report === 'json') {
      console.log(JSON.stringify(payload, null, 2))
    } else if (options.report === 'html') {
      console.log(createHtmlReport('Archora Forge Validate', payload))
    } else {
    logger.title()
    logger.success(schemas.length === 1 ? `Schema is valid OpenAPI ${primary.openapi}` : `${schemas.length} schemas are valid OpenAPI documents`)
    logger.line(`Health score: ${Math.min(...schemas.map((entry) => entry.health.score))}/100`)
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

function assertReportFormat(report: string | undefined): asserts report is ValidateOptions['report'] {
  if (report !== undefined && report !== 'json' && report !== 'html') {
    throw new Error(`Invalid report format "${report}". Expected "json" or "html".`)
  }
}

function createValidateReport(payload: Parameters<typeof createHtmlReport>[1], options: ValidateOptions): string {
  return options.report === 'html' ? createHtmlReport('Archora Forge Validate', payload) : JSON.stringify(payload, null, 2)
}

async function createValidateEntry(loaded: CliConfigResult) {
  const document = await parseOpenApi(loaded.schema, loaded.config.schemaRequest)
  const normalized = normalizeOpenApi(document)
  const health = calculateSchemaHealth(normalized)
  const diagnostics = collectDiagnostics(normalized)

  return {
    name: loaded.name ?? 'default',
    schema: loaded.schema,
    configPath: loaded.configPath,
    openapi: document.openapi,
    health,
    diagnosticsCount: diagnostics.length,
    diagnostics,
  }
}
