import type { CAC } from 'cac'
import { diffOpenApiContracts, normalizeOpenApi, parseOpenApi } from '@archora/forge-core'

import { createHtmlReport, readGitBaseSchema, formatImpactReport, formatPullRequestComment, scanSourceUsages, requireCommercialLicense, writeReportFile, parseSchemaRequestHeaders, type SchemaRequestCliOptions, logger } from '@archora/forge-cli/internal'

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

  cli.command('impact <schema> [newSchema]', 'Create a frontend API impact report for a contract change')
    .option('--schema-header <header>', 'Add a remote schema request header as "name:value" or "name=value"')
    .option('--base <ref>', 'Read the previous schema from this git ref')
    .option('--json', 'Print machine-readable JSON')
    .option('--report <format>', 'Print a report format: json, markdown or html')
    .option('--report-file <path>', 'Write the selected impact report to a file')
    .option('--repo <path>', 'Scan a frontend repository for impacted generated API usages')
    .option('--pr-comment-file <path>', 'Write a pull-request comment Markdown artifact')
    .action(async (schema: string, newSchema: string | undefined, options: { base?: string; json?: boolean; report?: 'json' | 'markdown' | 'html'; reportFile?: string; repo?: string; prCommentFile?: string } & SchemaRequestCliOptions) => {
      await requireCommercialLicense('impact')
      assertImpactReportFormat(options.report)
      const schemaRequest = { headers: parseSchemaRequestHeaders(options.schemaHeader) }
      if (options.base && newSchema) throw new Error('Use either impact <oldSchema> <newSchema> or impact <schema> --base <ref>, not both.')
      if (!options.base && !newSchema) throw new Error('Missing <newSchema>. Use impact <oldSchema> <newSchema> or impact <schema> --base <ref>.')
      const baseSchema = options.base ? await readGitBaseSchema(schema, { base: options.base, repo: options.repo }) : null
      try {
        const oldSchema = baseSchema?.path ?? schema
        const currentSchema = baseSchema ? schema : newSchema!
        const oldDocument = await parseOpenApi(oldSchema, schemaRequest)
        const newDocument = await parseOpenApi(currentSchema, schemaRequest)
        const report = diffOpenApiContracts(normalizeOpenApi(oldDocument), normalizeOpenApi(newDocument))
        const ok = report.decision.status !== 'blocked'
        const sourceUsages = options.repo ? await scanSourceUsages(options.repo, report) : []
        const payload = {
          ok,
          ...(baseSchema ? { base: baseSchema.base } : {}),
          oldSchema: baseSchema?.label ?? oldSchema,
          newSchema: currentSchema,
          sourceUsages,
          ...report,
        }
        const reportFormat = options.json ? 'json' : (options.report ?? 'markdown')

        if (options.reportFile) {
          const reportPath = await writeReportFile(options.reportFile, formatImpactReport(reportFormat, payload))
          console.log(`Report written: ${reportPath}`)
        } else if (reportFormat === 'json') {
          console.log(JSON.stringify(payload, null, 2))
        } else if (reportFormat === 'html') {
          console.log(createHtmlReport('Frontend Impact Center', payload))
        } else {
          console.log(formatImpactReport('markdown', payload))
        }
        if (options.prCommentFile) {
          const commentPath = await writeReportFile(options.prCommentFile, formatPullRequestComment(payload))
          console.log(`PR comment written: ${commentPath}`)
        }

        process.exitCode = ok ? 0 : 1
      } finally {
        await baseSchema?.cleanup()
      }
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
