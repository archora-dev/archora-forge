import type { CAC } from 'cac'
import {
  createGenerationPlan,
  detectResources,
  normalizeOpenApi,
  parseOpenApi,
  summarizeFilePlan,
} from '@archora/forge-core'

import { loadCliConfigSet, type CliConfigResult } from '../config.js'
import type { SchemaRequestCliOptions } from '../schema-request.js'
import { writeReportFile } from '../report-file.js'
import { logger } from '../ui/logger.js'

type DiffOptions = {
  config?: string
  json?: boolean
  reportFile?: string
} & SchemaRequestCliOptions

export function registerDiffCommand(cli: CAC): void {
  cli.command('diff [schema]', 'Show files that would be created, updated or protected')
    .option('--config <path>', 'Use a specific Archora Forge config file')
    .option('--schema-header <header>', 'Add a remote schema request header as "name:value" or "name=value"')
    .option('--json', 'Print machine-readable JSON')
    .option('--report-file <path>', 'Write the file-plan JSON report to a file')
    .action(async (schema: string | undefined, options: DiffOptions) => {
    const entries = await Promise.all((await loadCliConfigSet(schema, options)).map(createDiffEntry))
    const primary = entries[0]
    if (!primary) throw new Error('No OpenAPI schema inputs were resolved.')
    const summary = sumFileSummaries(entries.map((entry) => entry.files))

    const payload = {
      ok: true,
      schema: primary.schema,
      configPath: primary.configPath,
      schemas: entries,
      resources: entries.reduce((total, entry) => total + entry.resources, 0),
      files: summary,
    }

    if (options.reportFile) {
      const reportPath = await writeReportFile(options.reportFile, JSON.stringify(payload, null, 2))
      console.log(`Report written: ${reportPath}`)
      return
    }

    if (options.json) {
      console.log(JSON.stringify(payload, null, 2))
      return
    }

    logger.title()
    logger.line(entries.length === 1 ? `Schema loaded: ${primary.schema}` : `Schemas loaded: ${entries.length}`)
    if (primary.configPath) logger.line(`Config loaded: ${primary.configPath}`)
    logger.line(`Resources detected: ${payload.resources}`)
    logger.line(`Files to create: ${summary.create}`)
    logger.line(`Files to update: ${summary.update}`)
    logger.line(`Protected files: ${summary.protected}`)
  })
}

async function createDiffEntry(loaded: CliConfigResult) {
  const document = await parseOpenApi(loaded.schema, loaded.config.schemaRequest)
  const normalized = normalizeOpenApi(document)
  const resources = detectResources(normalized.operations).filter((resource) => loaded.config.resources[resource.name]?.enabled !== false)
  const plan = await createGenerationPlan({
    config: loaded.config,
    normalized,
    resources,
    cwd: loaded.cwd,
  })
  const files = summarizeFilePlan(plan.files)

  return {
    name: loaded.name ?? 'default',
    schema: loaded.schema,
    configPath: loaded.configPath,
    resources: resources.length,
    files,
  }
}

function sumFileSummaries(summaries: Array<{ create: number; update: number; protected: number }>): {
  create: number
  update: number
  protected: number
} {
  return summaries.reduce(
    (total, summary) => ({
      create: total.create + summary.create,
      update: total.update + summary.update,
      protected: total.protected + summary.protected,
    }),
    { create: 0, update: 0, protected: 0 },
  )
}
