import type { CAC } from 'cac'

import {
  logger,
  requireCommercialLicense,
  runAuditPackage,
  type AuditOptions,
} from '@archora/forge-cli/internal'

export function registerAuditCommand(cli: CAC): void {
  cli
    .command('audit [schema]', 'Create a local frontend API adoption package')
    .option('--config <path>', 'Use a specific Archora Forge config file')
    .option(
      '--schema-header <header>',
      'Add a remote schema request header as "name:value" or "name=value"',
    )
    .option('--out <path>', 'Output directory for the audit package')
    .option('--json', 'Print the audit JSON payload')
    .option('--skip-typecheck', 'Skip generated-output TypeScript typecheck')
    .option('--min-health-score <score>', 'Use this health score as the audit acceptance threshold')
    .action(async (schema: string | undefined, options: AuditOptions) => {
      try {
        await requireCommercialLicense('audit')
        const result = await runAuditPackage(schema, options)

        if (options.json) {
          console.log(JSON.stringify(result.payload, null, 2))
        } else {
          logger.title()
          logger.line(`Audit package: ${result.outDir}`)
          logger.line(`Schemas: ${result.entries.length}`)
          logger.line(`Resources: ${result.payload.resources}`)
          logger.line(`Generated files: ${result.payload.generatedFiles}`)
          logger.line(`Typecheck: ${result.payload.typecheck.status}`)
          logger.line(`Decision: ${result.payload.readiness.decision}`)
        }

        process.exitCode = result.payload.ok ? 0 : 1
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
