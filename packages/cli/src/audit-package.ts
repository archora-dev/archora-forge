import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { promisify } from 'node:util'

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
import { createHtmlReport } from './html-report.js'
import { writeReportFile } from './report-file.js'
import type { SchemaRequestCliOptions } from './schema-request.js'

const execFileAsync = promisify(execFile)

export type AuditOptions = {
  config?: string
  out?: string
  json?: boolean
  skipTypecheck?: boolean
  minHealthScore?: string | number
} & SchemaRequestCliOptions

type TypecheckResult = {
  status: 'passed' | 'failed' | 'skipped'
  command: string
  workspace: string
  errors: string[]
}

type AuditEntry = {
  name: string
  schema: string
  configPath: string | null
  healthScore: number
  resources: number
  generatedFiles: number
  protectedFiles: number
  drift: Array<{ path: string; kind: string }>
  diagnostics: ForgeDiagnostic[]
  coverage: SchemaCoverageMatrix
  plan: GenerationPlan
  resourceExplorer: ResourceExplorerEntry[]
}

type ResourceExplorerEntry = {
  name: string
  entity: string
  kind: string
  operations: Array<{ method: string; path: string; operationId: string | null; kind: string }>
  generatedFiles: string[]
}

export async function runAuditPackage(schema: string | undefined, options: AuditOptions) {
  const outDir = resolve(options.out ?? 'forge-audit')
  const minHealthScore = parseMinHealthScore(options.minHealthScore) ?? 90
  const loaded = await loadCliConfigSet(schema, options)
  const entries = await Promise.all(loaded.map(runAuditEntry))
  const primary = entries[0]
  if (!primary) throw new Error('No OpenAPI schema inputs were resolved.')

  await mkdir(outDir, { recursive: true })
  await writeGeneratedPreview(outDir, entries)
  const typecheck = options.skipTypecheck
    ? createSkippedTypecheck(outDir)
    : await runGeneratedOutputTypecheck(outDir, entries)
  const payload = createAuditPayload(entries, { outDir, minHealthScore, typecheck })
  const html = createHtmlReport('Archora Forge Audit', payload)
  const markdown = createAuditMarkdown(payload)

  await Promise.all([
    writeReportFile(join(outDir, 'index.html'), html),
    writeReportFile(join(outDir, 'report.json'), JSON.stringify(payload, null, 2)),
    writeReportFile(join(outDir, 'report.md'), markdown),
    writeReportFile(join(outDir, 'adoption-plan.md'), createAdoptionPlan(payload)),
    writeReportFile(join(outDir, 'ci.yml'), createCiWorkflow(payload)),
    writeReportFile(join(outDir, 'typecheck.md'), createTypecheckMarkdown(typecheck)),
  ])

  return { outDir, entries, payload }
}

async function runAuditEntry(loaded: CliConfigResult): Promise<AuditEntry> {
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
    drift,
    diagnostics,
    coverage,
    plan,
    resourceExplorer: resources.map((resource) => createResourceExplorerEntry(resource, plan)),
  }
}

function createAuditPayload(
  entries: AuditEntry[],
  options: { outDir: string; minHealthScore: number; typecheck: TypecheckResult },
) {
  const diagnostics = entries.flatMap((entry) => entry.diagnostics)
  const drift = entries.flatMap((entry) => entry.drift)
  const healthScore = Math.min(...entries.map((entry) => entry.healthScore))
  const generatedFiles = entries.reduce((total, entry) => total + entry.generatedFiles, 0)
  const protectedFiles = entries.reduce((total, entry) => total + entry.protectedFiles, 0)
  const resources = entries.reduce((total, entry) => total + entry.resources, 0)
  const coverage = mergeSchemaCoverageMatrices(entries.map((entry) => entry.coverage))
  const generator = summarizeAuditGeneratorMetadata(entries)
  const scorecard = createScorecard({
    healthScore,
    diagnostics,
    drift,
    coverage,
    typecheck: options.typecheck,
  })
  const failedChecks = [
    ...(drift.length > 0 ? ['drift'] : []),
    ...(healthScore < options.minHealthScore ? ['health-score'] : []),
    ...(diagnostics.some((diagnostic) => diagnostic.severity === 'error') ? ['errors'] : []),
    ...(options.typecheck.status === 'failed' ? ['generated-typecheck'] : []),
  ]
  const ok = failedChecks.length === 0

  return {
    ok,
    schema: displayPath(entries[0]?.schema ?? ''),
    schemas: entries.map((entry) => ({
      name: entry.name,
      schema: displayPath(entry.schema),
      configPath: entry.configPath ? displayPath(entry.configPath) : null,
      healthScore: entry.healthScore,
      resources: entry.resources,
      generatedFiles: entry.generatedFiles,
      protectedFiles: entry.protectedFiles,
      driftCount: entry.drift.length,
      diagnosticsCount: entry.diagnostics.length,
      coverage: entry.coverage,
    })),
    audit: {
      outDir: displayPath(options.outDir),
      generatedPreview: displayPath(join(options.outDir, 'generated-preview')),
      artifacts: [
        'index.html',
        'report.md',
        'report.json',
        'typecheck.md',
        'ci.yml',
        'adoption-plan.md',
        'generated-preview/',
      ],
    },
    healthScore,
    resources,
    generatedFiles,
    protectedFiles,
    failedChecks,
    scorecard,
    generator,
    coverage,
    typecheck: options.typecheck,
    resourceExplorer: entries.flatMap((entry) => entry.resourceExplorer),
    fixSuggestions: createFixSuggestions(diagnostics),
    readiness: createAuditReadiness({
      ok,
      healthScore,
      minHealthScore: options.minHealthScore,
      diagnostics,
      drift,
      typecheck: options.typecheck,
      generatedFiles,
      resources,
    }),
    drift,
    diagnostics,
  }
}

function createResourceExplorerEntry(
  resource: DetectedResource,
  plan: GenerationPlan,
): ResourceExplorerEntry {
  return {
    name: resource.name,
    entity: resource.entity,
    kind: resource.kind,
    operations: resource.operationsList.map((operation) => ({
      method: operation.method.toUpperCase(),
      path: operation.path,
      operationId: operation.id,
      kind: operation.operationKind,
    })),
    generatedFiles: plan.files
      .filter(
        (file) =>
          file.path.includes(`/features/${resource.name}/`) ||
          file.path.includes(`/shared/api/generated/${resource.name}/`),
      )
      .map((file) => file.path)
      .sort(),
  }
}

async function writeGeneratedPreview(outDir: string, entries: AuditEntry[]): Promise<void> {
  await Promise.all(
    entries.flatMap((entry) =>
      entry.plan.files
        .filter((file) => file.kind === 'generated')
        .map(async (file) => {
          const path = join(outDir, 'generated-preview', entry.name, file.path)
          await mkdir(dirname(path), { recursive: true })
          await writeFile(path, file.content, 'utf8')
        }),
    ),
  )
}

async function runGeneratedOutputTypecheck(
  outDir: string,
  entries: AuditEntry[],
): Promise<TypecheckResult> {
  const workspace = join(outDir, 'generated-output-typecheck')
  const tsconfigPath = join(workspace, 'tsconfig.json')
  const srcDir = join(workspace, 'src')
  await Promise.all(
    entries.flatMap((entry) =>
      entry.plan.files
        .filter((file) => file.kind === 'generated' && file.path.endsWith('.ts'))
        .map(async (file) => {
          const path = join(srcDir, entry.name, file.path)
          await mkdir(dirname(path), { recursive: true })
          await writeFile(path, file.content, 'utf8')
        }),
    ),
  )
  await writeFile(tsconfigPath, JSON.stringify(createTypecheckTsconfig(workspace), null, 2), 'utf8')
  const command = `pnpm exec tsc -p ${displayPath(tsconfigPath)}`
  try {
    await execFileAsync('pnpm', ['exec', 'tsc', '-p', tsconfigPath], {
      cwd: process.cwd(),
      timeout: 120_000,
    })
    return { status: 'passed', command, workspace: displayPath(workspace), errors: [] }
  } catch (error) {
    const details = error as { stdout?: string; stderr?: string; message?: string; code?: unknown }
    const output = [details.stdout, details.stderr, details.message]
      .filter(Boolean)
      .join('\n')
      .trim()
    return {
      status: 'failed',
      command,
      workspace: displayPath(workspace),
      errors: output
        ? output.split('\n').slice(0, 80)
        : [`tsc failed with code ${String(details.code ?? 'unknown')}`],
    }
  }
}

function createTypecheckTsconfig(workspace: string): Record<string, unknown> {
  const runtimeSource = relative(
    workspace,
    resolve(process.cwd(), 'packages/runtime/src/index.ts'),
  ).replace(/\\/g, '/')
  return {
    compilerOptions: {
      baseUrl: '.',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      noEmit: true,
      paths: {
        '@archora/forge-runtime': [
          runtimeSource,
          './node_modules/@archora/forge-runtime/dist/index.d.ts',
        ],
      },
      skipLibCheck: true,
      strict: true,
      target: 'ES2022',
    },
    include: ['src/**/*.ts'],
  }
}

function createSkippedTypecheck(outDir: string): TypecheckResult {
  return {
    status: 'skipped',
    command: 'skipped by --skip-typecheck',
    workspace: displayPath(join(outDir, 'generated-output-typecheck')),
    errors: [],
  }
}

function createScorecard(input: {
  healthScore: number
  diagnostics: ForgeDiagnostic[]
  drift: Array<{ path: string; kind: string }>
  coverage: SchemaCoverageMatrix
  typecheck: TypecheckResult
}) {
  const errorCount = input.diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  ).length
  const warningCount = input.diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'warning',
  ).length
  return {
    frontendReadiness: clamp(
      input.healthScore - errorCount * 15 - warningCount * 2 - input.drift.length * 2,
    ),
    typeSafety:
      input.typecheck.status === 'passed' ? 100 : input.typecheck.status === 'skipped' ? 70 : 30,
    resourceCoverage:
      input.coverage.operations.total === 0
        ? 100
        : Math.round((input.coverage.operations.generated / input.coverage.operations.total) * 100),
    driftSafety: input.drift.length === 0 ? 100 : clamp(100 - input.drift.length * 10),
    ciAdoption: input.typecheck.status === 'failed' ? 60 : 100,
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
      suggestion: items.find((item) => item.suggestion)?.suggestion ?? defaultSuggestion(code),
    }))
    .sort((left, right) => right.count - left.count || left.code.localeCompare(right.code))
}

function defaultSuggestion(code: string): string {
  if (code.includes('response-schema'))
    return 'Add explicit 2xx JSON response schemas for generated response types.'
  if (code.includes('request-schema'))
    return 'Add explicit application/json request body schemas for generated request types.'
  if (code.startsWith('unsupported-'))
    return 'Keep the endpoint in custom code or simplify the schema shape for generated v1 adoption.'
  return 'Review the diagnostic and decide whether the schema or the adoption scope should change.'
}

function createAuditReadiness(input: {
  ok: boolean
  healthScore: number
  minHealthScore: number
  diagnostics: ForgeDiagnostic[]
  drift: Array<{ path: string; kind: string }>
  typecheck: TypecheckResult
  generatedFiles: number
  resources: number
}) {
  const blockers = [
    ...(input.healthScore < input.minHealthScore
      ? [`Health score ${input.healthScore} is below the audit threshold ${input.minHealthScore}.`]
      : []),
    ...(input.drift.length > 0 ? ['Generated output drift is present.'] : []),
    ...input.diagnostics
      .filter((diagnostic) => diagnostic.severity === 'error')
      .map((diagnostic) => `Error diagnostic: ${diagnostic.code}.`),
    ...(input.typecheck.status === 'failed' ? ['Generated TypeScript typecheck failed.'] : []),
  ]
  const warnings = [
    ...(input.diagnostics.some((diagnostic) => diagnostic.severity === 'warning')
      ? [
          `${input.diagnostics.filter((diagnostic) => diagnostic.severity === 'warning').length} warning diagnostics need review.`,
        ]
      : []),
    ...(input.typecheck.status === 'skipped'
      ? ['Generated TypeScript typecheck was skipped.']
      : []),
  ]
  const nextActions = [
    ...(input.drift.length > 0 ? ['Run `archora-forge generate` and review generated drift.'] : []),
    ...(input.typecheck.status === 'failed'
      ? ['Open `typecheck.md`, fix generator/schema blockers, then rerun `archora-forge audit`.']
      : []),
    ...(input.diagnostics.length > 0
      ? ['Use fix suggestions to decide which OpenAPI changes are required before purchase.']
      : []),
    ...(input.ok ? ['Use this audit package as the paid pilot evidence bundle.'] : []),
  ]
  const status = blockers.length > 0 ? 'blocked' : warnings.length > 0 ? 'needs-attention' : 'ready'
  const gate =
    status === 'ready'
      ? {
          result: 'pass' as const,
          recommendedCiMode: 'block' as const,
          reason:
            'Generated resource layer is ready for a blocking CI gate under the current policy.',
        }
      : status === 'needs-attention'
        ? {
            result: 'warn' as const,
            recommendedCiMode: 'comment' as const,
            reason:
              'Continue evaluation, but require explicit owner review before blocking merges.',
          }
        : {
            result: 'fail' as const,
            recommendedCiMode: 'block' as const,
            reason: 'Do not widen rollout until blockers are fixed or explicitly accepted.',
          }

  return {
    status,
    gate,
    decision: input.ok
      ? 'Generated resource layer is ready for local adoption review.'
      : 'Generated resource layer needs fixes or explicit risk acceptance before purchase.',
    blockers,
    warnings,
    nextActions: nextActions.length > 0 ? nextActions : ['No action required.'],
    reviewerChecklist: [
      'Open `index.html` and confirm detected resources match the frontend mental model.',
      'Open `report.md` and review blockers, warnings, scorecard and fix suggestions.',
      'Open `typecheck.md` and confirm generated TypeScript passed or every failure is triaged.',
      'Compare generated files with the existing API layer before committing rollout scope.',
    ],
    summary: {
      healthScore: input.healthScore,
      resources: input.resources,
      generatedFiles: input.generatedFiles,
      protectedFiles: 0,
      diagnostics: input.diagnostics.length,
      drift: input.drift.length,
      failedChecks: blockers.length,
    },
  }
}

function summarizeAuditGeneratorMetadata(entries: AuditEntry[]) {
  const files = entries.flatMap((entry) => entry.plan.files)
  const total = files.filter((file) => file.kind === 'generated').length
  return {
    status: 'previewed',
    version: files.find((file) => file.metadata)?.metadata?.version ?? 'unknown',
    files: {
      total,
      missingMetadata: files
        .filter((file) => file.kind === 'generated' && !file.metadata)
        .map((file) => ({ path: file.path })),
      versionMismatches: [],
      schemaHashMismatches: [],
      configHashMismatches: [],
    },
  }
}

function createAuditMarkdown(payload: ReturnType<typeof createAuditPayload>): string {
  return `# Archora Forge Audit

Status: ${payload.ok ? 'passed' : 'failed'}

## Executive Review

Readiness: ${payload.readiness.status}

Gate: ${payload.readiness.gate.result}

Recommended CI mode: ${payload.readiness.gate.recommendedCiMode}

Gate reason: ${payload.readiness.gate.reason}

Decision: ${payload.readiness.decision}

Health score: ${payload.healthScore}

Resources: ${payload.resources}

Generated files: ${payload.generatedFiles}

Typecheck: ${payload.typecheck.status}

## Scorecard

${Object.entries(payload.scorecard)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

## Fix Suggestions

${payload.fixSuggestions.length > 0 ? payload.fixSuggestions.map((item) => `- ${item.code} (${item.count}): ${item.suggestion}`).join('\n') : '- No fix suggestions.'}

## Reviewer Checklist

${payload.readiness.reviewerChecklist.map((item) => `- ${item}`).join('\n')}

## Artifacts

${payload.audit.artifacts.map((artifact) => `- ${artifact}`).join('\n')}
`
}

function createAdoptionPlan(payload: ReturnType<typeof createAuditPayload>): string {
  return `# Adoption Plan

Decision: ${payload.readiness.decision}

## Next Actions

${payload.readiness.nextActions.map((action) => `- ${action}`).join('\n')}

## Acceptance Gates

- Check report status: ${payload.ok ? 'passed' : 'failed'}
- Generated TypeScript typecheck: ${payload.typecheck.status}
- Drift entries: ${payload.drift.length}
- Diagnostics: ${payload.diagnostics.length}

## First Resource Candidates

${payload.resourceExplorer
  .slice(0, 10)
  .map(
    (resource) =>
      `- ${resource.name}: ${resource.operations.length} operations, ${resource.generatedFiles.length} generated files`,
  )
  .join('\n')}
`
}

function createCiWorkflow(payload: ReturnType<typeof createAuditPayload>): string {
  return `name: archora-forge-audit

on:
  pull_request:
  push:
    branches: [main]

jobs:
  forge-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec archora-forge audit ${payload.schema} --out forge-audit
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: archora-forge-audit
          path: forge-audit
`
}

function createTypecheckMarkdown(typecheck: TypecheckResult): string {
  return `# Generated Output Typecheck

- Status: ${typecheck.status}
- Command: \`${typecheck.command}\`
- Workspace: \`${typecheck.workspace}\`

## Errors

${typecheck.errors.length > 0 ? typecheck.errors.map((line) => `- ${line}`).join('\n') : '- None.'}
`
}

function parseMinHealthScore(value: string | number | undefined): number | undefined {
  if (value === undefined) return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new Error(`Invalid minimum health score "${value}". Expected a number between 0 and 100.`)
  }
  return parsed
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function displayPath(path: string): string {
  if (!path) return path
  const relativePath = relative(process.cwd(), path).replace(/\\/g, '/')
  return relativePath && !relativePath.startsWith('..') ? relativePath : path.replace(/\\/g, '/')
}
