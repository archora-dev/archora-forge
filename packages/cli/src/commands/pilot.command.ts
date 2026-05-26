import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import type { CAC } from 'cac'
import { diffOpenApiContracts, normalizeOpenApi, parseOpenApi } from '@archora/forge-core'

import { readGitBaseSchema } from '../git-base-schema.js'
import { formatImpactReport, formatPullRequestComment, scanSourceUsages, type ImpactPayload } from '../impact-report.js'
import { requireCommercialLicense } from '../license.js'
import { writeReportFile } from '../report-file.js'
import { parseSchemaRequestHeaders, type SchemaRequestCliOptions } from '../schema-request.js'
import { logger } from '../ui/logger.js'
import { runAuditPackage } from './audit.command.js'

type PilotOptions = {
  old?: string
  base?: string
  repo?: string
  out?: string
  skipTypecheck?: boolean
  minHealthScore?: string | number
} & SchemaRequestCliOptions

export function registerPilotCommand(cli: CAC): void {
  cli.command('pilot <schema>', 'Create a paid-pilot package with impact, audit and go/no-go artifacts')
    .option('--old <schema>', 'Previous OpenAPI schema for impact review')
    .option('--base <ref>', 'Read the previous schema from this git ref')
    .option('--repo <path>', 'Scan a frontend repository for impacted generated API usages')
    .option('--out <path>', 'Output directory for the pilot package')
    .option('--schema-header <header>', 'Add a remote schema request header as "name:value" or "name=value"')
    .option('--skip-typecheck', 'Skip generated-output TypeScript typecheck')
    .option('--min-health-score <score>', 'Use this health score as the audit acceptance threshold')
    .action(async (schema: string, options: PilotOptions) => {
      try {
        await requireCommercialLicense('pilot')
        if (!options.old && !options.base) throw new Error('Missing --old <schema> or --base <ref>. Pilot packages need a previous schema for impact review.')
        if (options.old && options.base) throw new Error('Use either --old <schema> or --base <ref>, not both.')
        const outDir = resolve(options.out ?? 'forge-pilot')
        await mkdir(outDir, { recursive: true })

        const impact = await createPilotImpact(schema, options)
        await Promise.all([
          writeReportFile(join(outDir, 'impact.md'), formatImpactReport('markdown', impact)),
          writeReportFile(join(outDir, 'impact.json'), JSON.stringify(impact, null, 2)),
          writeReportFile(join(outDir, 'impact-pr.md'), formatPullRequestComment(impact)),
        ])

        const audit = await runAuditPackage(schema, {
          config: undefined,
          out: join(outDir, 'audit'),
          json: false,
          skipTypecheck: options.skipTypecheck,
          minHealthScore: options.minHealthScore,
          schemaHeader: options.schemaHeader,
        })
        const decision = createGoNoGo({ impact, auditOk: audit.payload.ok, auditDecision: audit.payload.readiness.decision })
        await writeReportFile(join(outDir, 'go-no-go.md'), decision.markdown)

        logger.title()
        logger.line(`Pilot package: ${outDir}`)
        logger.line(`Decision: ${decision.status}`)
        logger.line(`Impact: ${impact.decision.status}`)
        logger.line(`Audit: ${audit.payload.ok ? 'passed' : 'failed'}`)

        process.exitCode = decision.status === 'go' ? 0 : decision.status === 'conditional-go' ? 1 : 1
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error))
        process.exitCode = 2
      }
    })
}

async function createPilotImpact(newSchema: string, options: PilotOptions): Promise<ImpactPayload> {
  const schemaRequest = { headers: parseSchemaRequestHeaders(options.schemaHeader) }
  const baseSchema = options.base ? await readGitBaseSchema(newSchema, { base: options.base, repo: options.repo }) : null
  try {
    const oldSchema = baseSchema?.path ?? options.old!
    const oldDocument = await parseOpenApi(oldSchema, schemaRequest)
    const newDocument = await parseOpenApi(newSchema, schemaRequest)
    const report = diffOpenApiContracts(normalizeOpenApi(oldDocument), normalizeOpenApi(newDocument))
    const sourceUsages = options.repo ? await scanSourceUsages(options.repo, report) : []
    return {
      ok: report.decision.status !== 'blocked',
      ...(baseSchema ? { base: baseSchema.base } : {}),
      oldSchema: baseSchema?.label ?? oldSchema,
      newSchema,
      sourceUsages,
      ...report,
    }
  } finally {
    await baseSchema?.cleanup()
  }
}

function createGoNoGo(input: { impact: ImpactPayload; auditOk: boolean; auditDecision: string }): {
  status: 'go' | 'conditional-go' | 'no-go'
  markdown: string
} {
  const blockers = [
    ...(input.impact.decision.status === 'blocked' ? ['Impact decision is blocked.'] : []),
    ...(!input.auditOk ? ['Audit readiness failed.'] : []),
  ]
  const warnings = [
    ...(input.impact.decision.status === 'review' ? ['Impact decision needs review.'] : []),
    ...(input.impact.sourceUsages && input.impact.sourceUsages.length === 0 ? ['No impacted source usages were found.'] : []),
  ]
  const status = blockers.length > 0 ? 'no-go' : warnings.length > 0 ? 'conditional-go' : 'go'
  const lines = [
    '# Forge Pilot Go/No-Go',
    '',
    `Decision: ${status}`,
    '',
    '## Evidence',
    '',
    ...(input.impact.base ? [`- Base ref: ${input.impact.base}`] : []),
    `- Old schema: ${input.impact.oldSchema}`,
    `- New schema: ${input.impact.newSchema}`,
    `- Impact decision: ${input.impact.decision.status}`,
    `- Impact merge risk: ${input.impact.decision.mergeRisk}`,
    `- Breaking changes: ${input.impact.summary.breaking}`,
    `- Warnings: ${input.impact.summary.warnings}`,
    `- Source usage matches: ${input.impact.sourceUsages?.length ?? 0}`,
    `- Audit decision: ${input.auditDecision}`,
    '',
    '## Blockers',
    '',
    ...(blockers.length > 0 ? blockers.map((item) => `- ${item}`) : ['No blockers.']),
    '',
    '## Warnings',
    '',
    ...(warnings.length > 0 ? warnings.map((item) => `- ${item}`) : ['No warnings.']),
    '',
    '## Next Actions',
    '',
    ...(status === 'go'
      ? ['- Add Forge impact and audit checks to CI.', '- Generate the resource layer in a branch and review it with the frontend team.']
      : status === 'conditional-go'
        ? ['- Review warnings with the frontend owner.', '- Decide whether accepted warnings should be documented in the pilot report.']
        : ['- Fix blockers before buying or rolling out Forge.', '- Re-run `archora-forge pilot` after schema or config changes.']),
    '',
  ]
  return { status, markdown: lines.join('\n') }
}
