import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

import type { ContractDiffReport } from '@archora/forge-core'

import { createHtmlReport } from './html-report.js'

export type SourceUsage = {
  path: string
  matches: string[]
  lines: number[]
}

export type ImpactPayload = ContractDiffReport & {
  ok: boolean
  base?: string
  oldSchema: string
  newSchema: string
  sourceUsages?: SourceUsage[]
}

export function formatImpactReport(format: 'json' | 'markdown' | 'html', payload: ImpactPayload): string {
  if (format === 'json') return JSON.stringify(payload, null, 2)
  if (format === 'html') return createHtmlReport('Frontend Impact Center', payload)
  return formatImpactMarkdown(payload)
}

export function formatImpactMarkdown(payload: ImpactPayload): string {
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

export function formatPullRequestComment(payload: ImpactPayload): string {
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

export function formatSourceUsageLines(usages: SourceUsage[]): string[] {
  if (usages.length === 0) return ['No impacted source usages found.']
  return usages.slice(0, 50).map((usage) => `- \`${usage.path}:${usage.lines.join(',')}\`: ${usage.matches.join(', ')}`)
}

export async function scanSourceUsages(repo: string, report: ContractDiffReport): Promise<SourceUsage[]> {
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
