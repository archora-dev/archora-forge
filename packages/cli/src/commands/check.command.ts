import type { CAC } from 'cac'
import {
  calculateSchemaHealth,
  calculateDrift,
  collectDiagnostics,
  createGenerationPlan,
  detectResources,
  normalizeOpenApi,
  parseOpenApi,
  summarizeFilePlan,
} from '@archora/forge-core'

import { loadCliConfigSet } from '../config.js'
import { createHtmlReport } from '../html-report.js'
import type { SchemaRequestCliOptions } from '../schema-request.js'
import { writeReportFile } from '../report-file.js'
import { logger } from '../ui/logger.js'

type CheckOptions = {
  config?: string
  json?: boolean
  report?: 'json' | 'markdown' | 'html'
  reportFile?: string
  minHealthScore?: string | number
} & SchemaRequestCliOptions

export function registerCheckCommand(cli: CAC): void {
  cli.command('check [schema]', 'Check generated output drift and diagnostics without writing files')
    .option('--config <path>', 'Use a specific Archora Forge config file')
    .option('--schema-header <header>', 'Add a remote schema request header as "name:value" or "name=value"')
    .option('--json', 'Print machine-readable JSON')
    .option('--report <format>', 'Print a report format: json, markdown or html')
    .option('--report-file <path>', 'Write the selected check report to a file')
    .option('--min-health-score <score>', 'Fail when the OpenAPI health score is below this value')
    .action(async (schema: string | undefined, options: CheckOptions) => {
      try {
        assertReportFormat(options.report)
        const minHealthScore = parseMinHealthScore(options.minHealthScore)
        const checks = await Promise.all((await loadCliConfigSet(schema, options)).map((loaded) => runCheck(loaded, { minHealthScore })))
        const primary = checks[0]
        if (!primary) throw new Error('No OpenAPI schema inputs were resolved.')
        const drift = checks.flatMap((check) => check.drift)
        const diagnostics = checks.flatMap((check) => check.diagnostics)
        const failedChecks = [...new Set(checks.flatMap((check) => check.failedChecks))]
        const ok = failedChecks.length === 0
        const healthScore = Math.min(...checks.map((check) => check.healthScore))
        const payload = {
          ok,
          schema: primary.schema,
          schemas: checks.map((check) => ({
            name: check.name,
            schema: check.schema,
            configPath: check.configPath,
            healthScore: check.healthScore,
            resources: check.resources,
            generatedFiles: check.generatedFiles,
            protectedFiles: check.protectedFiles,
            driftCount: check.drift.length,
            diagnosticsCount: check.diagnostics.length,
            failedChecks: check.failedChecks,
          })),
          healthScore,
          resources: checks.reduce((total, check) => total + check.resources, 0),
          generatedFiles: checks.reduce((total, check) => total + check.generatedFiles, 0),
          protectedFiles: checks.reduce((total, check) => total + check.protectedFiles, 0),
          failedChecks,
          drift,
          diagnostics,
        }

        if (options.reportFile) {
          const reportPath = await writeReportFile(
            options.reportFile,
            createCheckReport(payload, options),
          )
          console.log(`Report written: ${reportPath}`)
        } else if (options.json || options.report === 'json') {
          console.log(JSON.stringify(payload, null, 2))
        } else if (options.report === 'markdown') {
          console.log(createMarkdownReport(payload))
        } else if (options.report === 'html') {
          console.log(createHtmlReport('Archora Forge Check', payload))
        } else {
          logger.title()
          logger.line(checks.length === 1 ? `Schema: ${primary.schema}` : `Schemas: ${checks.length}`)
          logger.line(`Resources: ${payload.resources}`)
          logger.line(`Generated files: ${payload.generatedFiles}`)
          logger.line(`Protected files: ${payload.protectedFiles}`)
          logger.line(`Failed checks: ${payload.failedChecks.length > 0 ? payload.failedChecks.join(', ') : 'none'}`)
          logger.line('')
          logger.line('Drift:')
          if (drift.length === 0) logger.success('Generated output is up to date.')
          for (const entry of drift) logger.warn(`${entry.path} is ${entry.kind}`)
          logger.line('')
          logger.line('Diagnostics:')
          if (diagnostics.length === 0) logger.success('No diagnostics.')
          for (const diagnostic of diagnostics.slice(0, 20)) logger.warn(`${diagnostic.severity} ${diagnostic.code}: ${diagnostic.message}`)
          logger.line('')
          logger.line(ok ? 'Result: generated output is up to date.' : 'Result: generated output is not up to date.')
        }

        process.exitCode = ok ? 0 : 1
      } catch (error) {
        if (options.json) {
          console.log(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2))
        } else {
          logger.error(error instanceof Error ? error.message : String(error))
        }
        process.exitCode = 2
      }
    })
}

function assertReportFormat(report: string | undefined): asserts report is CheckOptions['report'] {
  if (report !== undefined && report !== 'json' && report !== 'markdown' && report !== 'html') {
    throw new Error(`Invalid report format "${report}". Expected "json", "markdown" or "html".`)
  }
}

function createCheckReport(payload: Parameters<typeof createHtmlReport>[1], options: CheckOptions): string {
  if (options.report === 'html') return createHtmlReport('Archora Forge Check', payload)
  if (options.json || options.report === 'json') return JSON.stringify(payload, null, 2)
  return createMarkdownReport(payload as Parameters<typeof createMarkdownReport>[0])
}

function parseMinHealthScore(value: string | number | undefined): number | undefined {
  if (value === undefined) return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new Error(`Invalid minimum health score "${value}". Expected a number between 0 and 100.`)
  }

  return parsed
}

async function runCheck(
  loaded: Awaited<ReturnType<typeof loadCliConfigSet>>[number],
  options: { minHealthScore?: number } = {},
) {
  const document = await parseOpenApi(loaded.schema, loaded.config.schemaRequest)
  const normalized = normalizeOpenApi(document)
  const resources = detectResources(normalized.operations).filter((resource) => loaded.config.resources[resource.name]?.enabled !== false)
  const plan = await createGenerationPlan({ config: loaded.config, normalized, resources, cwd: loaded.cwd })
  const summary = summarizeFilePlan(plan.files)
  const drift = await calculateDrift(plan.files, { cwd: loaded.cwd })
  const diagnostics = collectDiagnostics(normalized)
  const healthScore = calculateSchemaHealth(normalized).score
  const failedChecks = evaluateFailedChecks({
    drift,
    diagnostics,
    healthScore,
    ci: { ...loaded.config.ci, minHealthScore: options.minHealthScore ?? loaded.config.ci.minHealthScore },
  })

  return {
    name: loaded.name ?? 'default',
    schema: loaded.schema,
    configPath: loaded.configPath,
    healthScore,
    resources: resources.length,
    generatedFiles: plan.files.filter((file) => file.kind === 'generated').length,
    protectedFiles: summary.protected,
    drift,
    diagnostics,
    failedChecks,
  }
}

function createMarkdownReport(payload: {
  ok: boolean
  failedChecks: string[]
  drift: Array<{ path: string; kind: string }>
  diagnostics: Array<{ severity: string; code: string; message: string }>
  healthScore?: number
}): string {
  const drift = payload.drift.length === 0 ? '- No drift detected.' : payload.drift.map((entry) => `- \`${entry.path}\` is ${entry.kind}`).join('\n')
  const diagnostics =
    payload.diagnostics.length === 0
      ? '- No diagnostics.'
      : payload.diagnostics.map((diagnostic) => `- ${diagnostic.severity} \`${diagnostic.code}\`: ${diagnostic.message}`).join('\n')

  return `# Archora Forge Check

Status: ${payload.ok ? 'passed' : 'failed'}

Failed checks: ${payload.failedChecks.length > 0 ? payload.failedChecks.join(', ') : 'none'}

Health score: ${payload.healthScore ?? 'n/a'}

## Drift

${drift}

## Diagnostics

${diagnostics}

## Suggested action

${payload.ok ? 'No action required.' : 'Run `archora-forge generate <schema>` and commit generated changes, or fix reported OpenAPI diagnostics.'}
`
}

function evaluateFailedChecks(input: {
  drift: Array<{ path: string; kind: string }>
  diagnostics: Array<{ severity: string; code: string }>
  healthScore: number
  ci: {
    failOnWarnings: boolean
    failOnUnsupportedFeatures: boolean
    failOnMissingSchemas: boolean
    failOnDrift: boolean
    minHealthScore?: number
  }
}): string[] {
  const failed = new Set<string>()
  if (input.ci.failOnDrift && input.drift.length > 0) failed.add('drift')
  if (input.ci.minHealthScore !== undefined && input.healthScore < input.ci.minHealthScore) failed.add('health-score')
  if (input.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) failed.add('errors')
  if (input.ci.failOnWarnings && input.diagnostics.some((diagnostic) => diagnostic.severity === 'warning')) failed.add('warnings')
  if (input.ci.failOnUnsupportedFeatures && input.diagnostics.some((diagnostic) => diagnostic.code.startsWith('unsupported-'))) {
    failed.add('unsupported-features')
  }
  if (
    input.ci.failOnMissingSchemas &&
    input.diagnostics.some((diagnostic) => diagnostic.code === 'missing-request-schema' || diagnostic.code === 'missing-response-schema')
  ) {
    failed.add('missing-schemas')
  }

  return [...failed]
}
