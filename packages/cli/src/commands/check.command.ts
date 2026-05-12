import type { CAC } from 'cac'
import {
  calculateDrift,
  collectDiagnostics,
  createGenerationPlan,
  detectResources,
  normalizeOpenApi,
  parseOpenApi,
  summarizeFilePlan,
} from '@archora/forge-core'

import { loadCliConfig } from '../config.js'
import { logger } from '../ui/logger.js'

type CheckOptions = {
  config?: string
  json?: boolean
  report?: 'markdown'
  reportFile?: string
}

export function registerCheckCommand(cli: CAC): void {
  cli.command('check [schema]', 'Check generated output drift and diagnostics without writing files')
    .option('--config <path>', 'Use a specific Archora Forge config file')
    .option('--json', 'Print machine-readable JSON')
    .option('--report <format>', 'Print a report format, currently markdown')
    .action(async (schema: string | undefined, options: CheckOptions) => {
      try {
        const loaded = await loadCliConfig(schema, options)
        const document = await parseOpenApi(loaded.schema, loaded.config.schemaRequest)
        const normalized = normalizeOpenApi(document)
        const resources = detectResources(normalized.operations).filter((resource) => loaded.config.resources[resource.name]?.enabled !== false)
        const plan = await createGenerationPlan({ config: loaded.config, normalized, resources, cwd: loaded.cwd })
        const summary = summarizeFilePlan(plan.files)
        const drift = await calculateDrift(plan.files, { cwd: loaded.cwd })
        const diagnostics = collectDiagnostics(normalized)
        const criticalDiagnostics = diagnostics.filter((diagnostic) => diagnostic.severity === 'error')
        const ok = drift.length === 0 && criticalDiagnostics.length === 0
        const payload = {
          ok,
          schema: loaded.schema,
          resources: resources.length,
          generatedFiles: plan.files.filter((file) => file.kind === 'generated').length,
          protectedFiles: summary.protected,
          drift,
          diagnostics,
        }

        if (options.json) {
          console.log(JSON.stringify(payload, null, 2))
        } else if (options.report === 'markdown') {
          console.log(createMarkdownReport(payload))
        } else {
          logger.title()
          logger.line(`Schema: ${loaded.schema}`)
          logger.line(`Resources: ${payload.resources}`)
          logger.line(`Generated files: ${payload.generatedFiles}`)
          logger.line(`Protected files: ${payload.protectedFiles}`)
          logger.line('')
          logger.line('Drift:')
          if (drift.length === 0) logger.success('Generated output is up to date.')
          for (const entry of drift) logger.warn(`${entry.path} is ${entry.kind}`)
          logger.line('')
          logger.line('Diagnostics:')
          if (diagnostics.length === 0) logger.success('No diagnostics.')
          for (const diagnostic of diagnostics.slice(0, 20)) logger.warn(`${diagnostic.severity} ${diagnostic.code}: ${diagnostic.message}`)
          logger.line('')
          logger.line(ok ? 'Result: generated output is up to date.' : 'Result: generated output is not up to date.')
        }

        process.exitCode = ok ? 0 : 1
      } catch (error) {
        if (options.json) {
          console.log(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2))
        } else {
          logger.error(error instanceof Error ? error.message : String(error))
        }
        process.exitCode = 2
      }
    })
}

function createMarkdownReport(payload: {
  ok: boolean
  drift: Array<{ path: string; kind: string }>
  diagnostics: Array<{ severity: string; code: string; message: string }>
}): string {
  const drift = payload.drift.length === 0 ? '- No drift detected.' : payload.drift.map((entry) => `- \`${entry.path}\` is ${entry.kind}`).join('\n')
  const diagnostics =
    payload.diagnostics.length === 0
      ? '- No diagnostics.'
      : payload.diagnostics.map((diagnostic) => `- ${diagnostic.severity} \`${diagnostic.code}\`: ${diagnostic.message}`).join('\n')

  return `# Archora Forge Check

Status: ${payload.ok ? 'passed' : 'failed'}

## Drift

${drift}

## Diagnostics

${diagnostics}

## Suggested action

${payload.ok ? 'No action required.' : 'Run `archora-forge generate <schema>` and commit generated changes, or fix reported OpenAPI diagnostics.'}
`
}
