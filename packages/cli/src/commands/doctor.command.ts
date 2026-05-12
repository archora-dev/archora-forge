import type { CAC } from 'cac'
import { calculateSchemaHealth, collectDiagnostics, detectResources, normalizeOpenApi, parseOpenApi } from '@archora/forge-core'

import { loadCliConfigSet, type CliConfigResult } from '../config.js'
import type { SchemaRequestCliOptions } from '../schema-request.js'
import { writeReportFile } from '../report-file.js'
import { logger } from '../ui/logger.js'

type DoctorOptions = {
  config?: string
  json?: boolean
  reportFile?: string
} & SchemaRequestCliOptions

export function registerDoctorCommand(cli: CAC): void {
  cli
    .command('doctor [schema]', 'Check Archora Forge config, schema and output readiness')
    .option('--config <path>', 'Use a specific Archora Forge config file')
    .option('--schema-header <header>', 'Add a remote schema request header as "name:value" or "name=value"')
    .option('--json', 'Print machine-readable JSON')
    .option('--report-file <path>', 'Write a JSON readiness report to a file')
    .action(async (schema: string | undefined, options: DoctorOptions) => {
      const schemas = await Promise.all((await loadCliConfigSet(schema, options)).map(analyzeSchema))
      const primary = schemas[0]
      if (!primary) throw new Error('No OpenAPI schema inputs were resolved.')
      const ok = schemas.every((entry) => entry.ok)
      const diagnostics = schemas.flatMap((entry) => entry.diagnostics)
      const payload = {
        ok,
        schema: primary.schema,
        configPath: primary.configPath,
        output: primary.output,
        schemas,
        resourceCount: schemas.reduce((total, entry) => total + entry.resourceCount, 0),
        healthScore: Math.min(...schemas.map((entry) => entry.healthScore)),
        diagnosticsCount: diagnostics.length,
        diagnostics,
      }

      if (options.reportFile) {
        const reportPath = await writeReportFile(options.reportFile, JSON.stringify(payload, null, 2))
        console.log(`Report written: ${reportPath}`)
      } else if (options.json) {
        console.log(JSON.stringify(payload, null, 2))
      } else {
        logger.title()
        logger.line(schemas.length === 1 ? `Schema: ${primary.schema}` : `Schemas: ${schemas.length}`)
        logger.line(`Config: ${primary.configPath ?? 'none'}`)
        logger.line(`Generated output: ${primary.output.generatedDir}`)
        logger.line(`Features output: ${primary.output.featuresDir}`)
        logger.line(`Pages output: ${primary.output.pagesDir}`)
        logger.line(`Mocks output: ${primary.output.mocksDir}`)
        logger.line(`Health score: ${payload.healthScore}/100`)
        logger.line(`Resources: ${payload.resourceCount}`)
        logger.line(`Diagnostics: ${diagnostics.length}`)
        for (const diagnostic of diagnostics.slice(0, 20)) {
          const line = `${diagnostic.severity} ${diagnostic.code}: ${diagnostic.message}`
          if (diagnostic.severity === 'error') logger.error(line)
          else logger.warn(line)
        }
        logger.line('')
        logger.line(ok ? 'Result: project is ready.' : 'Result: project needs attention.')
      }

      process.exitCode = ok ? 0 : 1
    })
}

async function analyzeSchema(loaded: CliConfigResult) {
  const document = await parseOpenApi(loaded.schema, loaded.config.schemaRequest)
  const normalized = normalizeOpenApi(document)
  const resources = detectResources(normalized.operations).filter((resource) => loaded.config.resources[resource.name]?.enabled !== false)
  const health = calculateSchemaHealth(normalized)
  const diagnostics = collectDiagnostics(normalized)

  return {
    name: loaded.name ?? 'default',
    ok: !diagnostics.some((diagnostic) => diagnostic.severity === 'error'),
    schema: loaded.schema,
    configPath: loaded.configPath,
    output: loaded.config.output,
    resourceCount: resources.length,
    healthScore: health.score,
    diagnosticsCount: diagnostics.length,
    diagnostics,
  }
}
