import type { CAC } from 'cac'
import { diffOpenApiContracts, normalizeOpenApi, parseOpenApi } from '@archora/forge-core'

import { logger } from '../ui/logger.js'

export function registerContractDiffCommand(cli: CAC): void {
  cli.command('contract-diff <oldSchema> <newSchema>', 'Compare two OpenAPI schemas and report frontend impact')
    .option('--json', 'Print machine-readable JSON')
    .action(async (oldSchema: string, newSchema: string, options: { json?: boolean }) => {
      const oldDocument = await parseOpenApi(oldSchema)
      const newDocument = await parseOpenApi(newSchema)
      const report = diffOpenApiContracts(normalizeOpenApi(oldDocument), normalizeOpenApi(newDocument))

      if (options.json) {
        console.log(JSON.stringify(report, null, 2))
      } else {
        logger.title()
        logger.line(`Old schema: ${oldSchema}`)
        logger.line(`New schema: ${newSchema}`)
        logger.line(`Changes: ${report.changes.length}`)
        logger.line(`Affected resources: ${report.affectedResources.length > 0 ? report.affectedResources.join(', ') : 'none'}`)
        logger.line('')
        for (const change of report.changes.slice(0, 40)) {
          const line = `${change.severity} ${change.code}: ${change.message} (${change.location})`
          if (change.severity === 'breaking') logger.warn(line)
          else logger.line(line)
        }
      }

      process.exitCode = report.changes.some((change) => change.severity === 'breaking') ? 1 : 0
    })
}
