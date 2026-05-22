import type { CAC } from 'cac'
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
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
    .option('--repo <path>', 'Scan a frontend repository for impacted generated API usages')
    .option('--pr-comment-file <path>', 'Write a pull-request comment Markdown artifact')
    .action(async (oldSchema: string, newSchema: string, options: { json?: boolean; report?: 'json' | 'markdown' | 'html'; reportFile?: string; repo?: string; prCommentFile?: string } & SchemaRequestCliOptions) => {
      assertImpactReportFormat(options.report)
      const schemaRequest = { headers: parseSchemaRequestHeaders(options.schemaHeader) }
      const oldDocument = await parseOpenApi(oldSchema, schemaRequest)
      const newDocument = await parseOpenApi(newSchema, schemaRequest)
      const report = diffOpenApiContracts(normalizeOpenApi(oldDocument), normalizeOpenApi(newDocument))
      const ok = report.decision.status !== 'blocked'
      const sourceUsages = options.repo ? await scanSourceUsages(options.repo, report) : []
      const payload = { ok, oldSchema, newSchema, sourceUsages, ...report }
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
      if (options.prCommentFile) {
        const commentPath = await writeReportFile(options.prCommentFile, formatPullRequestComment(payload))
        console.log(`PR comment written: ${commentPath}`)
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

type SourceUsage = {
  path: string
  matches: string[]
  lines: number[]
}

type ImpactPayload = ContractDiffReport & {
  ok: boolean
  oldSchema: string
  newSchema: string
  sourceUsages?: SourceUsage[]
}

function formatImpactReport(format: 'json' | 'markdown' | 'html', payload: ImpactPayload): string {
  if (format === 'json') return JSON.stringify(payload, null, 2)
  if (format === 'html') return createHtmlReport('Frontend Impact Center', payload)
  return formatImpactMarkdown(payload)
}

function formatImpactMarkdown(payload: ImpactPayload): string {
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
    '## Source Usage',
    '',
    ...formatSourceUsageLines(payload.sourceUsages ?? []),
    '',
  ]
  return lines.join('\n')
}

function formatPullRequestComment(payload: ImpactPayload): string {
  return [
    '## Frontend API Impact',
    '',
    payload.prSummary,
    '',
    '## Source Usage',
    '',
    ...formatSourceUsageLines(payload.sourceUsages ?? []),
    '',
  ].join('\n')
}

function formatSourceUsageLines(usages: SourceUsage[]): string[] {
  if (usages.length === 0) return ['No impacted source usages found.']
  return usages.slice(0, 50).map((usage) => `- \`${usage.path}:${usage.lines.join(',')}\`: ${usage.matches.join(', ')}`)
}

async function scanSourceUsages(repo: string, report: ContractDiffReport): Promise<SourceUsage[]> {
  const tokens = createUsageTokens(report)
  if (tokens.length === 0) return []
  const files = await collectSourceFiles(repo)
  const usages: SourceUsage[] = []
  for (const file of files) {
    const content = await readFile(file, 'utf8')
    const matches = tokens.filter((token) => content.includes(token))
    if (matches.length > 0) {
      usages.push({
        path: normalizePath(relative(repo, file)),
        matches: [...new Set(matches)].sort(),
        lines: collectMatchedLines(content, matches),
      })
    }
  }
  return usages.sort((left, right) => left.path.localeCompare(right.path)).slice(0, 200)
}

function collectMatchedLines(content: string, matches: string[]): number[] {
  const lines = content.split(/\r?\n/)
  const matchedLines = new Set<number>()
  lines.forEach((line, index) => {
    if (matches.some((match) => line.includes(match))) matchedLines.add(index + 1)
  })
  return [...matchedLines].sort((left, right) => left - right).slice(0, 20)
}

function createUsageTokens(report: ContractDiffReport): string[] {
  const clientMethods = report.impactedSurface.clientMethods.map((method) => method.replace(/\(\)$/, ''))
  const resourceTokens = report.affectedResources.flatMap((resource) => [`${resource}Client`, `${resource}QueryKeys`, `${resource}Config`, `${resource}Permissions`])
  return [...new Set([...report.impactedSurface.operationIds, ...clientMethods, ...report.impactedSurface.queryHooks, ...resourceTokens].filter(Boolean))].sort()
}

async function collectSourceFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    if (shouldSkipEntry(entry.name)) continue
    const path = join(root, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(path)))
    } else if (entry.isFile() && isSourceFile(entry.name)) {
      files.push(path)
    }
  }
  return files
}

function shouldSkipEntry(name: string): boolean {
  return name === 'node_modules' || name === '.git' || name === 'dist' || name === 'build' || name === 'coverage' || name === '.vitepress' || name === '.turbo'
}

function isSourceFile(name: string): boolean {
  return /\.(cjs|cts|js|jsx|mjs|mts|svelte|ts|tsx|vue)$/.test(name)
}

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/')
}
