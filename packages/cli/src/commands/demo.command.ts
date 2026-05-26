import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import type { CAC } from 'cac'
import { diffOpenApiContracts, normalizeOpenApi, parseOpenApi } from '@archora/forge-core'

import { formatImpactReport, formatPullRequestComment, scanSourceUsages } from '../impact-report.js'
import { writeReportFile } from '../report-file.js'
import { logger } from '../ui/logger.js'
import { runAuditPackage } from './audit.command.js'

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

        logger.title()
        logger.line(`Demo package: ${outDir}`)
        logger.line(`Decision: ${impact.decision.status === 'blocked' ? 'no-go' : 'review'}`)
        logger.line(`Impact report: ${join(reportDir, 'impact.md')}`)
        process.exitCode = impact.decision.status === 'blocked' ? 1 : 0
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
