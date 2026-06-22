import { resolve } from 'node:path'

import type { CAC } from 'cac'

import {
  adoptionReportArtifacts,
  buildAdoptionReport,
  createAdoptionMarkdown,
} from '../adoption-report.js'
import { writeReportFile } from '../report-file.js'
import type { SchemaRequestCliOptions } from '../schema-request.js'
import { logger } from '../ui/logger.js'

type AdoptionOptions = {
  config?: string
  out?: string
  json?: boolean
} & SchemaRequestCliOptions

export function registerAdoptionCommand(cli: CAC): void {
  cli
    .command(
      'adoption [schema]',
      'Summarize how much of an OpenAPI schema Forge can generate today',
    )
    .option('--config <path>', 'Use a specific Archora Forge config file')
    .option(
      '--schema-header <header>',
      'Add a remote schema request header as "name:value" or "name=value"',
    )
    .option('--out <path>', 'Write the adoption report to a directory')
    .option('--json', 'Print the adoption JSON payload')
    .action(async (schema: string | undefined, options: AdoptionOptions) => {
      try {
        const payload = await buildAdoptionReport(schema, options)

        if (options.out) {
          const outDir = resolve(options.out)
          const artifacts = adoptionReportArtifacts(outDir)
          await Promise.all([
            writeReportFile(artifacts.markdown, createAdoptionMarkdown(payload)),
            writeReportFile(artifacts.json, JSON.stringify(payload, null, 2)),
          ])
          logger.title()
          logger.line(`Adoption report: ${outDir}`)
          logger.line(`Health score: ${payload.healthScore}/100`)
          logger.line(
            `Operation coverage: ${payload.coverage.operations.generated}/${payload.coverage.operations.total}`,
          )
          process.exitCode = payload.ok ? 0 : 1
          return
        }

        if (options.json) {
          console.log(JSON.stringify(payload, null, 2))
          process.exitCode = payload.ok ? 0 : 1
          return
        }

        const coveragePercent =
          payload.coverage.operations.total === 0
            ? 100
            : Math.round(
                (payload.coverage.operations.generated / payload.coverage.operations.total) * 100,
              )
        logger.title()
        logger.line(`Status: ${payload.ok ? 'ready' : 'blocked'}`)
        logger.line(`Health score: ${payload.healthScore}/100`)
        logger.line(`Resources: ${payload.resources}`)
        logger.line(
          `Operation coverage: ${payload.coverage.operations.generated}/${payload.coverage.operations.total} (${coveragePercent}%)`,
        )
        logger.line(
          `Files to commit: ${payload.generatedFiles} generated, ${payload.protectedFiles} protected`,
        )
        logger.line(
          `Diagnostics: ${payload.diagnostics.total} (${payload.diagnostics.errors} errors, ${payload.diagnostics.warnings} warnings)`,
        )
        if (payload.firstResources.length > 0) {
          logger.line('')
          logger.line('First resources:')
          for (const resource of payload.firstResources.slice(0, 10)) {
            logger.line(
              `- ${resource.name}: ${resource.operations} operations, ${resource.generatedFiles} generated files`,
            )
          }
        }
        process.exitCode = payload.ok ? 0 : 1
      } catch (error) {
        if (options.json) {
          console.log(
            JSON.stringify(
              { ok: false, error: error instanceof Error ? error.message : String(error) },
              null,
              2,
            ),
          )
        } else {
          logger.error(error instanceof Error ? error.message : String(error))
        }
        process.exitCode = 2
      }
    })
}
