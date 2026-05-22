import type { CAC } from 'cac'
import { diffOpenApiContracts, normalizeOpenApi, parseOpenApi, type ContractDiffReport } from '@archora/forge-core'

import { createHtmlReport } from '../html-report.js'
import { writeReportFile } from '../report-file.js'
import { parseSchemaRequestHeaders, type SchemaRequestCliOptions } from '../schema-request.js'
import { logger } from '../ui/logger.js'

export function registerContractDiffCommand(cli: CAC): void {
  cli.command('contract-diff <oldSchema> <newSchema>', 'Compare two OpenAPI schemas and report frontend impact')
    .option('--schema-header <header>', 'Add a remote schema request header as "name:value" or "name=value"')
    .option('--json', 'Print machine-readable JSON')
    .option('--report <format>', 'Print a report format: json or html')
    .option('--report-file <path>', 'Write the selected contract diff report to a file')
    .action(async (oldSchema: string, newSchema: string, options: { json?: boolean; report?: 'json' | 'html'; reportFile?: string } & SchemaRequestCliOptions) => {
      assertReportFormat(options.report)
      const schemaRequest = { headers: parseSchemaRequestHeaders(options.schemaHeader) }
      const oldDocument = await parseOpenApi(oldSchema, schemaRequest)
      const newDocument = await parseOpenApi(newSchema, schemaRequest)
      const report = diffOpenApiContracts(normalizeOpenApi(oldDocument), normalizeOpenApi(newDocument))
      const ok = !report.changes.some((change) => change.severity === 'breaking')
      const payload = { ok, oldSchema, newSchema, ...report }

      if (options.reportFile) {
        const reportPath = await writeReportFile(options.reportFile, options.report === 'html' ? createHtmlReport('Archora Forge Contract Diff', payload) : JSON.stringify(payload, null, 2))
        console.log(`Report written: ${reportPath}`)
      } else if (options.json || options.report === 'json') {
        console.log(JSON.stringify(payload, null, 2))
      } else if (options.report === 'html') {
        console.log(createHtmlReport('Archora Forge Contract Diff', payload))
      } else {
        logger.title()
        logger.line(`Old schema: ${oldSchema}`)
        logger.line(`New schema: ${newSchema}`)
        logger.line(`Changes: ${report.changes.length}`)
        logger.line(`Affected resources: ${report.affectedResources.length > 0 ? report.affectedResources.join(', ') : 'none'}`)
        logger.line('')
        for (const change of report.changes.slice(0, 40)) {
          const line = `${change.severity} ${change.code}: ${change.message} (${change.location})`
          if (change.severity === 'breaking') logger.warn(line)
          else logger.line(line)
        }
      }

      process.exitCode = ok ? 0 : 1
    })

  cli.command('impact <oldSchema> <newSchema>', 'Create a frontend API impact report for a contract change')
    .option('--schema-header <header>', 'Add a remote schema request header as "name:value" or "name=value"')
    .option('--json', 'Print machine-readable JSON')
    .option('--report <format>', 'Print a report format: json, markdown or html')
    .option('--report-file <path>', 'Write the selected impact report to a file')
    .action(async (oldSchema: string, newSchema: string, options: { json?: boolean; report?: 'json' | 'markdown' | 'html'; reportFile?: string } & SchemaRequestCliOptions) => {
      assertImpactReportFormat(options.report)
      const schemaRequest = { headers: parseSchemaRequestHeaders(options.schemaHeader) }
      const oldDocument = await parseOpenApi(oldSchema, schemaRequest)
      const newDocument = await parseOpenApi(newSchema, schemaRequest)
      const report = diffOpenApiContracts(normalizeOpenApi(oldDocument), normalizeOpenApi(newDocument))
      const ok = report.decision.status !== 'blocked'
      const payload = { ok, oldSchema, newSchema, ...report }
      const reportFormat = options.json ? 'json' : (options.report ?? 'markdown')

      if (options.reportFile) {
        const reportPath = await writeReportFile(options.reportFile, formatImpactReport(reportFormat, payload))
        console.log(`Report written: ${reportPath}`)
      } else if (reportFormat === 'json') {
        console.log(JSON.stringify(payload, null, 2))
      } else if (reportFormat === 'html') {
        console.log(createHtmlReport('Frontend Impact Center', payload))
      } else {
        console.log(formatImpactMarkdown(payload))
      }

      process.exitCode = ok ? 0 : 1
    })
}

function assertReportFormat(report: string | undefined): asserts report is 'json' | 'html' | undefined {
  if (report !== undefined && report !== 'json' && report !== 'html') {
    throw new Error(`Invalid report format "${report}". Expected "json" or "html".`)
  }
}

function assertImpactReportFormat(report: string | undefined): asserts report is 'json' | 'markdown' | 'html' | undefined {
  if (report !== undefined && report !== 'json' && report !== 'markdown' && report !== 'html') {
    throw new Error(`Invalid report format "${report}". Expected "json", "markdown" or "html".`)
  }
}

function formatImpactReport(format: 'json' | 'markdown' | 'html', payload: ContractDiffReport & { ok: boolean; oldSchema: string; newSchema: string }): string {
  if (format === 'json') return JSON.stringify(payload, null, 2)
  if (format === 'html') return createHtmlReport('Frontend Impact Center', payload)
  return formatImpactMarkdown(payload)
}

function formatImpactMarkdown(payload: ContractDiffReport & { ok: boolean; oldSchema: string; newSchema: string }): string {
  const lines = [
    '# Frontend API Impact',
    '',
    `Decision: ${payload.decision.status}`,
    `Merge risk: ${payload.decision.mergeRisk}`,
    `Reason: ${payload.decision.reason}`,
    '',
    '## Summary',
    '',
    `- Breaking: ${payload.summary.breaking}`,
    `- Warnings: ${payload.summary.warnings}`,
    `- Non-breaking: ${payload.summary.nonBreaking}`,
    `- Affected resources: ${payload.affectedResources.length > 0 ? payload.affectedResources.join(', ') : 'none'}`,
    `- Affected generated files: ${payload.affectedFiles.length}`,
    '',
    '## PR Summary',
    '',
    payload.prSummary,
    '',
    '## Migration Hints',
    '',
    ...(payload.migrationHints.length > 0 ? payload.migrationHints.map((hint) => `- ${hint}`) : ['No migration hints.']),
    '',
    '## Changes',
    '',
    ...(payload.changes.length > 0
      ? payload.changes.map((change) => `- ${change.severity} ${change.code}: ${change.message} (${change.location})`)
      : ['No contract changes.']),
    '',
    '## Impacted Surface',
    '',
    `- Operation IDs: ${payload.impactedSurface.operationIds.length > 0 ? payload.impactedSurface.operationIds.join(', ') : 'none'}`,
    `- Client methods: ${payload.impactedSurface.clientMethods.length > 0 ? payload.impactedSurface.clientMethods.join(', ') : 'none'}`,
    `- Query hooks: ${payload.impactedSurface.queryHooks.length > 0 ? payload.impactedSurface.queryHooks.join(', ') : 'none'}`,
    '',
  ]
  return lines.join('\n')
}
