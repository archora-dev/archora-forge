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
    `Merge decision: ${formatMergeDecision(payload.decision.status)}`,
    `Merge risk: ${payload.decision.mergeRisk}`,
    `Reason: ${payload.decision.reason}`,
    '',
    payload.prSummary,
    '',
    '## Next Actions',
    '',
    ...formatNextActionLines(payload),
    '',
    '## Source Usage',
    '',
    ...formatSourceUsageLines(payload.sourceUsages ?? []),
    '',
  ].join('\n')
}

function formatMergeDecision(status: ImpactPayload['decision']['status']): string {
  if (status === 'blocked') return 'block'
  if (status === 'review') return 'review'
  return 'pass'
}

function formatNextActionLines(payload: ImpactPayload): string[] {
  if (payload.decision.status === 'blocked') {
    return [
      '- Do not merge until the breaking frontend contract changes are handled.',
      '- Update impacted source usages before regenerating committed Forge output.',
      '- Re-run `archora-forge impact` after the OpenAPI or frontend changes are updated.',
    ]
  }

  if (payload.decision.status === 'review') {
    return [
      '- Review warnings with the frontend owner before merge.',
      '- Regenerate Forge output in the branch if the contract change is accepted.',
      '- Keep the PR comment attached to the API change for reviewer context.',
    ]
  }

  return [
    '- Merge can continue from the API impact perspective.',
    '- Regenerate Forge output when the schema change is accepted.',
    '- Keep `archora-forge check` in CI to catch drift after regeneration.',
  ]
}

export function formatSourceUsageLines(usages: SourceUsage[]): string[] {
  if (usages.length === 0) return ['No impacted source usages found.']
  return usages.slice(0, 50).map((usage) => `- \`${usage.path}:${usage.lines.join(',')}\`: ${usage.matches.join(', ')}`)
}

export async function scanSourceUsages(repo: string, report: ContractDiffReport): Promise<SourceUsage[]> {
  const tokens = createUsageTokens(report)
  if (tokens.length === 0) return []
  const patterns = tokens.map((token) => ({ token, pattern: tokenPattern(token) }))
  const files = await collectSourceFiles(repo)
  const usages: SourceUsage[] = []
  for (const file of files) {
    const content = await readFile(file, 'utf8')
    const matches = patterns.filter(({ pattern }) => pattern.test(content)).map(({ token }) => token)
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
  const patterns = matches.map((match) => tokenPattern(match))
  const lines = content.split(/\r?\n/)
  const matchedLines = new Set<number>()
  lines.forEach((line, index) => {
    if (patterns.some((pattern) => pattern.test(line))) matchedLines.add(index + 1)
  })
  return [...matchedLines].sort((left, right) => left - right).slice(0, 20)
}

// Matches a generated identifier as a whole word so a token like `listPets` does not
// falsely match `listPetsByOwner` or a substring inside an unrelated identifier.
function tokenPattern(token: string): RegExp {
  return new RegExp(`(?<![\\w$])${escapeRegExp(token)}(?![\\w$])`)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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
