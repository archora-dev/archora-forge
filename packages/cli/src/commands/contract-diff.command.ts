import type { CAC } from 'cac'
import { diffOpenApiContracts, normalizeOpenApi, parseOpenApi } from '@archora/forge-core'

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
}

function assertReportFormat(report: string | undefined): asserts report is 'json' | 'html' | undefined {
  if (report !== undefined && report !== 'json' && report !== 'html') {
    throw new Error(`Invalid report format "${report}". Expected "json" or "html".`)
  }
}
