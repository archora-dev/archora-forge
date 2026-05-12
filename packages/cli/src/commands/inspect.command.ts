import type { CAC } from 'cac'
import { calculateSchemaHealth, collectDiagnostics, detectResources, normalizeOpenApi, parseOpenApi } from '@archora/forge-core'

import { loadCliConfigSet, type CliConfigResult } from '../config.js'
import { createHtmlReport } from '../html-report.js'
import type { SchemaRequestCliOptions } from '../schema-request.js'
import { writeReportFile } from '../report-file.js'
import { logger } from '../ui/logger.js'

type InspectOptions = {
  config?: string
  json?: boolean
  report?: 'json' | 'html'
  reportFile?: string
} & SchemaRequestCliOptions

export function registerInspectCommand(cli: CAC): void {
  cli.command('inspect [schema]', 'Inspect an OpenAPI schema')
    .option('--config <path>', 'Use a specific Archora Forge config file')
    .option('--schema-header <header>', 'Add a remote schema request header as "name:value" or "name=value"')
    .option('--json', 'Print machine-readable JSON')
    .option('--report <format>', 'Print a report format: json or html')
    .option('--report-file <path>', 'Write the selected inspection report to a file')
    .action(async (schema: string | undefined, options: InspectOptions) => {
    assertReportFormat(options.report)
    const schemas = await Promise.all((await loadCliConfigSet(schema, options)).map(createInspectEntry))
    const primary = schemas[0]
    if (!primary) throw new Error('No OpenAPI schema inputs were resolved.')
    const diagnostics = schemas.flatMap((entry) => entry.diagnostics)
    const resources = schemas.flatMap((entry) => entry.resources)
    const payload = {
      ok: true,
      schema: primary.schema,
      configPath: primary.configPath,
      schemas,
      resourceCount: resources.length,
      resources,
      health: primary.health,
      diagnostics,
    }

    if (options.reportFile) {
      const reportPath = await writeReportFile(options.reportFile, createInspectReport(payload, options))
      console.log(`Report written: ${reportPath}`)
      return
    }

    if (options.json || options.report === 'json') {
      console.log(JSON.stringify(payload, null, 2))
      return
    }
    if (options.report === 'html') {
      console.log(createHtmlReport('Archora Forge Inspect', payload))
      return
    }

    logger.title()
    logger.line(schemas.length === 1 ? `Schema loaded: ${primary.schema}` : `Schemas loaded: ${schemas.length}`)
    if (primary.configPath) logger.line(`Config loaded: ${primary.configPath}`)
    logger.line(`OpenAPI Health Score: ${Math.min(...schemas.map((entry) => entry.health.score))}/100`)
    logger.line('')
    logger.line('Detected:')
    logger.line(`- ${schemas.reduce((total, entry) => total + entry.health.endpointCount, 0)} endpoints`)
    logger.line(`- ${schemas.reduce((total, entry) => total + entry.health.schemaCount, 0)} schemas`)
    logger.line(`- ${schemas.reduce((total, entry) => total + entry.health.tagCount, 0)} tags`)
    logger.line(`- ${resources.length} resources`)
    logger.line(`- ${schemas.reduce((total, entry) => total + entry.health.crudCandidateCount, 0)} CRUD candidates`)
    logger.line(`- ${schemas.reduce((total, entry) => total + entry.health.enumCount, 0)} enums`)
    logger.line(`- ${diagnostics.length} diagnostics`)
    const warnings = schemas.flatMap((entry) => entry.health.warnings)
    if (warnings.length > 0) {
      logger.line('')
      logger.line('Warnings:')
      for (const warning of warnings.slice(0, 20)) {
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

function assertReportFormat(report: string | undefined): asserts report is InspectOptions['report'] {
  if (report !== undefined && report !== 'json' && report !== 'html') {
    throw new Error(`Invalid report format "${report}". Expected "json" or "html".`)
  }
}

function createInspectReport(payload: Parameters<typeof createHtmlReport>[1], options: InspectOptions): string {
  return options.report === 'html' ? createHtmlReport('Archora Forge Inspect', payload) : JSON.stringify(payload, null, 2)
}

async function createInspectEntry(loaded: CliConfigResult) {
  const document = await parseOpenApi(loaded.schema, loaded.config.schemaRequest)
  const normalized = normalizeOpenApi(document)
  const resources = detectResources(normalized.operations).map((resource) => ({
    name: resource.name,
    entity: resource.entity,
    kind: resource.kind,
    isCrudCandidate: resource.isCrudCandidate,
    operations: Object.fromEntries(Object.entries(resource.operations).map(([kind, operation]) => [kind, operation.id])),
    missing: resource.missing,
  }))
  const health = calculateSchemaHealth(normalized)
  const diagnostics = collectDiagnostics(normalized)

  return {
    name: loaded.name ?? 'default',
    schema: loaded.schema,
    configPath: loaded.configPath,
    resourceCount: resources.length,
    resources,
    health,
    diagnosticsCount: diagnostics.length,
    diagnostics,
  }
}
