import { join, relative } from 'node:path'

import {
  calculateDrift,
  calculateSchemaHealth,
  collectDiagnostics,
  createGenerationPlan,
  createSchemaCoverageMatrix,
  detectResources,
  mergeSchemaCoverageMatrices,
  normalizeOpenApi,
  parseOpenApi,
  summarizeFilePlan,
  type DetectedResource,
  type ForgeDiagnostic,
  type GenerationPlan,
  type SchemaCoverageMatrix,
} from '@archora/forge-core'
import { resolveQueryComposables } from '@archora/forge-adapters'

import { loadCliConfigSet, type CliConfigResult } from './config.js'
import type { SchemaRequestCliOptions } from './schema-request.js'

export type AdoptionOptions = {
  config?: string
} & SchemaRequestCliOptions

type AdoptionEntry = {
  name: string
  schema: string
  configPath: string | null
  healthScore: number
  resources: number
  generatedFiles: number
  protectedFiles: number
  drift: number
  diagnostics: ForgeDiagnostic[]
  coverage: SchemaCoverageMatrix
  firstResources: Array<{
    name: string
    entity: string
    operations: number
    generatedFiles: number
  }>
}

export type AdoptionPayload = ReturnType<typeof createAdoptionPayload>

export async function buildAdoptionReport(
  schema: string | undefined,
  options: AdoptionOptions,
): Promise<AdoptionPayload> {
  const loaded = await loadCliConfigSet(schema, options)
  const entries = await Promise.all(loaded.map(buildAdoptionEntry))
  if (!entries[0]) throw new Error('No OpenAPI schema inputs were resolved.')
  return createAdoptionPayload(entries)
}

async function buildAdoptionEntry(loaded: CliConfigResult): Promise<AdoptionEntry> {
  const document = await parseOpenApi(loaded.schema, loaded.config.schemaRequest)
  const normalized = normalizeOpenApi(document)
  const resources = detectResources(normalized.operations).filter(
    (resource) => loaded.config.resources[resource.name]?.enabled !== false,
  )
  const plan = await createGenerationPlan({
    config: loaded.config,
    normalized,
    resources,
    cwd: loaded.cwd,
    composables: resolveQueryComposables(loaded.config.target.query),
  })
  const fileSummary = summarizeFilePlan(plan.files)
  const diagnostics = collectDiagnostics(normalized)
  const coverage = createSchemaCoverageMatrix(normalized, diagnostics)
  const drift = await calculateDrift(plan.files, { cwd: loaded.cwd })

  return {
    name: loaded.name ?? 'default',
    schema: loaded.schema,
    configPath: loaded.configPath,
    healthScore: calculateSchemaHealth(normalized).score,
    resources: resources.length,
    generatedFiles: plan.files.filter((file) => file.kind === 'generated').length,
    protectedFiles: fileSummary.protected,
    drift: drift.length,
    diagnostics,
    coverage,
    firstResources: resources.map((resource) => createFirstResourceEntry(resource, plan)),
  }
}

function createAdoptionPayload(entries: AdoptionEntry[]) {
  const diagnostics = entries.flatMap((entry) => entry.diagnostics)
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length
  const warnings = diagnostics.filter((diagnostic) => diagnostic.severity === 'warning').length
  const healthScore = Math.min(...entries.map((entry) => entry.healthScore))
  const generatedFiles = entries.reduce((total, entry) => total + entry.generatedFiles, 0)
  const protectedFiles = entries.reduce((total, entry) => total + entry.protectedFiles, 0)
  const resources = entries.reduce((total, entry) => total + entry.resources, 0)
  const drift = entries.reduce((total, entry) => total + entry.drift, 0)
  const coverage = mergeSchemaCoverageMatrices(entries.map((entry) => entry.coverage))

  return {
    ok: errors === 0,
    schema: displayPath(entries[0]?.schema ?? ''),
    configPath: entries[0]?.configPath ? displayPath(entries[0]!.configPath!) : null,
    schemas: entries.map((entry) => ({
      name: entry.name,
      schema: displayPath(entry.schema),
      configPath: entry.configPath ? displayPath(entry.configPath) : null,
      healthScore: entry.healthScore,
      resources: entry.resources,
      generatedFiles: entry.generatedFiles,
      protectedFiles: entry.protectedFiles,
      driftCount: entry.drift,
      diagnosticsCount: entry.diagnostics.length,
      coverage: entry.coverage,
    })),
    healthScore,
    resources,
    generatedFiles,
    protectedFiles,
    drift,
    coverage,
    diagnostics: { total: diagnostics.length, errors, warnings },
    fixSuggestions: createFixSuggestions(diagnostics),
    firstResources: entries
      .flatMap((entry) => entry.firstResources)
      .sort(
        (left, right) => right.operations - left.operations || left.name.localeCompare(right.name),
      )
      .slice(0, 10),
  }
}

function createFirstResourceEntry(
  resource: DetectedResource,
  plan: GenerationPlan,
): { name: string; entity: string; operations: number; generatedFiles: number } {
  return {
    name: resource.name,
    entity: resource.entity,
    operations: resource.operationsList.length,
    generatedFiles: plan.files.filter(
      (file) =>
        file.path.includes(`/features/${resource.name}/`) ||
        file.path.includes(`/shared/api/generated/${resource.name}/`),
    ).length,
  }
}

function createFixSuggestions(
  diagnostics: ForgeDiagnostic[],
): Array<{ code: string; count: number; suggestion: string }> {
  const groups = new Map<string, ForgeDiagnostic[]>()
  for (const diagnostic of diagnostics) {
    groups.set(diagnostic.code, [...(groups.get(diagnostic.code) ?? []), diagnostic])
  }
  return [...groups.entries()]
    .map(([code, items]) => ({
      code,
      count: items.length,
      suggestion:
        items.find((item) => item.suggestion)?.suggestion ??
        'Review the diagnostic and decide whether the schema or the adoption scope should change.',
    }))
    .sort((left, right) => right.count - left.count || left.code.localeCompare(right.code))
}

export function createAdoptionMarkdown(payload: AdoptionPayload): string {
  const coveragePercent =
    payload.coverage.operations.total === 0
      ? 100
      : Math.round(
          (payload.coverage.operations.generated / payload.coverage.operations.total) * 100,
        )
  return `# Archora Forge Adoption Report

Status: ${payload.ok ? 'ready' : 'blocked'}

## Summary

- Health score: ${payload.healthScore}/100
- Resources: ${payload.resources}
- Operation coverage: ${payload.coverage.operations.generated}/${payload.coverage.operations.total} (${coveragePercent}%)
- Files you would commit: ${payload.generatedFiles} generated, ${payload.protectedFiles} protected
- Generated output drift: ${payload.drift}
- Diagnostics: ${payload.diagnostics.total} (${payload.diagnostics.errors} errors, ${payload.diagnostics.warnings} warnings)

## First Resources

${payload.firstResources.length > 0 ? payload.firstResources.map((resource) => `- ${resource.name}: ${resource.operations} operations, ${resource.generatedFiles} generated files`).join('\n') : '- No resources detected.'}

## Fix Suggestions

${payload.fixSuggestions.length > 0 ? payload.fixSuggestions.map((item) => `- ${item.code} (${item.count}): ${item.suggestion}`).join('\n') : '- No fix suggestions.'}

## Next Steps

- Run \`archora-forge generate\` to write the resource layer into your repository.
- Commit the generated TypeScript and review it like any other code.
- Re-run \`archora-forge adoption\` after schema changes to track coverage over time.
`
}

function displayPath(path: string): string {
  if (!path) return path
  const relativePath = relative(process.cwd(), path).replace(/\\/g, '/')
  return relativePath && !relativePath.startsWith('..') ? relativePath : path.replace(/\\/g, '/')
}

export function adoptionReportArtifacts(outDir: string): { markdown: string; json: string } {
  return { markdown: join(outDir, 'report.md'), json: join(outDir, 'report.json') }
}
