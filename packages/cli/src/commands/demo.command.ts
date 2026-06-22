import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import type { CAC } from 'cac'
import { diffOpenApiContracts, normalizeOpenApi, parseOpenApi } from '@archora/forge-core'

import { createHtmlReport } from '../html-report.js'
import { formatImpactReport, formatPullRequestComment, scanSourceUsages } from '../impact-report.js'
import { writeReportFile } from '../report-file.js'
import { logger } from '../ui/logger.js'
import { runAuditPackage } from '../audit-package.js'

type DemoOptions = {
  out?: string
}

export function registerDemoCommand(cli: CAC): void {
  cli.command('demo', 'Create a self-contained Forge impact demo package')
    .option('--out <path>', 'Output directory for the demo package')
    .action(async (options: DemoOptions) => {
      try {
        const outDir = resolve(options.out ?? 'forge-demo')
        const reportDir = join(outDir, 'report')
        await mkdir(join(outDir, 'src'), { recursive: true })
        await mkdir(reportDir, { recursive: true })

        const oldSchema = join(outDir, 'openapi.old.yaml')
        const newSchema = join(outDir, 'openapi.yaml')
        await Promise.all([
          writeFile(oldSchema, demoOldSchema, 'utf8'),
          writeFile(newSchema, demoNewSchema, 'utf8'),
          writeFile(join(outDir, 'src', 'users.ts'), demoSource, 'utf8'),
        ])

        const oldDocument = await parseOpenApi(oldSchema)
        const newDocument = await parseOpenApi(newSchema)
        const report = diffOpenApiContracts(normalizeOpenApi(oldDocument), normalizeOpenApi(newDocument))
        const impact = {
          ok: report.decision.status !== 'blocked',
          oldSchema: 'openapi.old.yaml',
          newSchema: 'openapi.yaml',
          sourceUsages: await scanSourceUsages(outDir, report),
          ...report,
        }

        await Promise.all([
          writeReportFile(join(reportDir, 'impact.md'), formatImpactReport('markdown', impact)),
          writeReportFile(join(reportDir, 'impact.json'), JSON.stringify(impact, null, 2)),
          writeReportFile(join(reportDir, 'impact-pr.md'), formatPullRequestComment(impact)),
        ])

        const audit = await runAuditPackage(newSchema, {
          out: join(reportDir, 'audit'),
          json: false,
          skipTypecheck: true,
        })
        await writeReportFile(join(reportDir, 'go-no-go.md'), createDemoGoNoGo(impact, audit.payload.ok))
        await Promise.all([
          writeReportFile(join(reportDir, 'check.html'), createDemoCheckHtml(impact, audit.payload.ok)),
          writeReportFile(join(reportDir, 'README.md'), createDemoHandoff()),
        ])

        logger.title()
        logger.line(`Demo package: ${outDir}`)
        logger.line(`Decision: ${impact.decision.status === 'blocked' ? 'no-go' : 'review'}`)
        logger.line(`Impact report: ${join(reportDir, 'impact.md')}`)
        process.exitCode = 0
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error))
        process.exitCode = 2
      }
    })
}

function createDemoGoNoGo(impact: { decision: { status: string; mergeRisk: string }; summary: { breaking: number; warnings: number }; sourceUsages?: unknown[] }, auditOk: boolean): string {
  const status = impact.decision.status === 'blocked' || !auditOk ? 'no-go' : 'review'
  return [
    '# Forge Demo Go/No-Go',
    '',
    `Decision: ${status}`,
    '',
    '## Evidence',
    '',
    `- Impact decision: ${impact.decision.status}`,
    `- Impact merge risk: ${impact.decision.mergeRisk}`,
    `- Breaking changes: ${impact.summary.breaking}`,
    `- Warnings: ${impact.summary.warnings}`,
    `- Source usage matches: ${impact.sourceUsages?.length ?? 0}`,
    `- Audit: ${auditOk ? 'passed' : 'failed'}`,
    '',
    '## Next Actions',
    '',
    '- Open `report/impact.md` to review the API change.',
    '- Open `report/impact-pr.md` to see the PR comment artifact.',
    '- Replace the demo schemas with your OpenAPI file and run `archora-forge pilot`.',
    '',
  ].join('\n')
}

function createDemoCheckHtml(impact: {
  ok: boolean
  newSchema: string
  decision: { status: string; mergeRisk: string; reason: string }
  summary: { breaking: number; warnings: number; nonBreaking: number; total: number }
  affectedResources: string[]
  affectedFiles: string[]
  sourceUsages?: Array<{ path: string; matches: string[]; lines: number[] }>
  migrationHints: string[]
}, auditOk: boolean): string {
  const failedChecks = [
    ...(impact.decision.status === 'blocked' ? ['api-impact-blocked'] : []),
    ...(!auditOk ? ['audit-readiness-failed'] : []),
  ]
  const status = failedChecks.length === 0 ? 'ready' : 'blocked'
  return createHtmlReport('Archora Forge Check', {
    ok: failedChecks.length === 0,
    schema: impact.newSchema,
    healthScore: auditOk ? 100 : 80,
    generatedFiles: impact.affectedFiles.length,
    failedChecks,
    readiness: {
      status,
      gate:
        status === 'blocked'
          ? {
              result: 'fail',
              recommendedCiMode: 'block',
              reason: 'Demo impact contains blocking frontend API changes.',
            }
          : {
              result: 'pass',
              recommendedCiMode: 'block',
              reason: 'Demo package has no blocking checks under the current policy.',
            },
      decision:
        status === 'blocked'
          ? 'Do not merge until breaking frontend contract changes are handled.'
          : 'The demo package can continue through review.',
      blockers: failedChecks.length > 0 ? failedChecks.map((check) => `Failed check: ${check}.`) : [],
      warnings: impact.summary.warnings > 0 ? [`Impact report contains ${impact.summary.warnings} warnings.`] : [],
      nextActions:
        status === 'blocked'
          ? ['Open `impact-pr.md` first.', 'Review impacted source usages.', 'Open `audit/index.html` for generated output readiness.']
          : ['Attach this report to the PR or pilot handoff.'],
      reviewerChecklist: [
        'Confirm `impact-pr.md` gives a clear merge decision.',
        'Confirm affected generated files map to real frontend ownership.',
        'Confirm `audit/index.html` matches the expected resource model.',
      ],
    },
    summary: impact.summary,
    decision: impact.decision,
    affectedResources: impact.affectedResources,
    affectedFiles: impact.affectedFiles,
    sourceUsages: impact.sourceUsages,
    migrationHints: impact.migrationHints,
  })
}

function createDemoHandoff(): string {
  return [
    '# Forge Demo Package',
    '',
    'Open `impact-pr.md` first. It is the pull-request comment a reviewer should see before merge.',
    '',
    'Then review:',
    '',
    '- Open `impact.md` for the full frontend API impact report.',
    '- Open `check.html` for the reviewer-friendly readiness summary.',
    '- Open `audit/index.html` for generated output readiness and audit evidence.',
    '- Open `go-no-go.md` for the short adoption decision.',
    '',
    'To run the same package on a real repo:',
    '',
    '```sh',
    'archora-forge pilot ./openapi.yaml --base origin/main --repo . --out forge-pilot',
    'archora-forge ci init github --schema ./openapi.yaml --base origin/main --gate comment',
    '```',
    '',
  ].join('\n')
}

const demoOldSchema = `openapi: 3.0.3
info: { title: Forge Demo API, version: 1.0.0 }
paths:
  /users:
    get:
      operationId: listUsers
      tags: [Users]
      responses:
        "200":
          description: Users
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  required: [id, email]
                  properties:
                    id: { type: string }
                    email: { type: string }
`

const demoNewSchema = `openapi: 3.0.3
info: { title: Forge Demo API, version: 1.1.0 }
paths:
  /members:
    get:
      operationId: listMembers
      tags: [Members]
      responses:
        "200":
          description: Members
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  required: [id]
                  properties:
                    id: { type: string }
`

const demoSource = `import { usersClient } from './generated/users/users.client'

export async function loadUsers() {
  return usersClient.listUsers()
}
`
