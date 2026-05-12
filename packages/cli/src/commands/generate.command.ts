import type { CAC } from 'cac'
import {
  createGenerationPlan,
  collectDiagnostics,
  detectResources,
  normalizeOpenApi,
  parseOpenApi,
  type GeneratedFile,
  type WriteGeneratedFilesResult,
  summarizeFilePlan,
  writeGeneratedFiles,
} from '@archora/forge-core'

import { loadCliConfigSet, type CliConfigResult } from '../config.js'
import type { SchemaRequestCliOptions } from '../schema-request.js'
import { writeReportFile } from '../report-file.js'
import { logger } from '../ui/logger.js'

type GenerateOptions = {
  force?: boolean
  dryRun?: boolean
  config?: string
  json?: boolean
  reportFile?: string
} & SchemaRequestCliOptions

export function registerGenerateCommand(cli: CAC): void {
  cli
    .command('generate [schema]', 'Generate frontend modules from an OpenAPI schema')
    .option('--force', 'Overwrite protected custom files')
    .option('--dry-run', 'Print planned changes without writing files')
    .option('--config <path>', 'Use a specific Archora Forge config file')
    .option('--schema-header <header>', 'Add a remote schema request header as "name:value" or "name=value"')
    .option('--json', 'Print machine-readable JSON')
    .option('--report-file <path>', 'Write the generation JSON summary to a file')
    .action(async (schema: string | undefined, options: GenerateOptions) => {
      const plannedEntries = []
      for (const loaded of await loadCliConfigSet(schema, options)) {
        plannedEntries.push(await createGeneratePlanEntry(loaded, options))
      }
      assertNoDuplicateGeneratedPaths(plannedEntries)

      const entries = []
      for (const entry of plannedEntries) {
        const result = await writeGeneratedFiles(entry.filesToWrite, {
          cwd: entry.cwd,
          dryRun: options.dryRun ?? false,
        })
        entries.push({
          ...entry.payload,
          files: {
            planned: entry.payload.files.planned,
            result,
          },
        })
      }
      const primary = entries[0]
      if (!primary) throw new Error('No OpenAPI schema inputs were resolved.')
      const diagnostics = entries.flatMap((entry) => entry.diagnostics)
      const summary = sumFileSummaries(entries.map((entry) => entry.files.planned))
      const result = sumWriteResults(entries.map((entry) => entry.files.result))

      const payload = {
        ok: true,
        schema: primary.schema,
        configPath: primary.configPath,
        schemas: entries,
        dryRun: options.dryRun ?? false,
        resources: entries.reduce((total, entry) => total + entry.resources, 0),
        diagnostics,
        files: {
          planned: summary,
          result,
        },
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
      logger.line(`Diagnostics: ${diagnostics.length}`)
      for (const diagnostic of diagnostics.slice(0, 10)) {
        logger.warn(`${diagnostic.code}: ${diagnostic.message}`)
      }
      logger.line(`Files to create: ${summary.create}`)
      logger.line(`Files to update: ${summary.update}`)
      logger.line(`Protected files: ${summary.protected}`)
      logger.line('')
      logger.success(options.dryRun ? 'Dry run complete' : 'Generation complete')
      logger.line(`Created: ${result.created}`)
      logger.line(`Updated: ${result.updated}`)
      logger.line(`Unchanged: ${result.unchanged}`)
      logger.line(`Protected: ${result.protected}`)
    })
}

async function createGeneratePlanEntry(loaded: CliConfigResult, options: GenerateOptions) {
  const document = await parseOpenApi(loaded.schema, loaded.config.schemaRequest)
  const normalized = normalizeOpenApi(document)
  const resources = detectResources(normalized.operations).filter((resource) => loaded.config.resources[resource.name]?.enabled !== false)
  const diagnostics = collectDiagnostics(normalized)
  const plan = await createGenerationPlan({
    config: loaded.config,
    normalized,
    resources,
    cwd: loaded.cwd,
  })
  const planned = summarizeFilePlan(plan.files)

  return {
    name: loaded.name ?? 'default',
    cwd: loaded.cwd,
    filesToWrite: plan.files,
    payload: {
      name: loaded.name ?? 'default',
      schema: loaded.schema,
      configPath: loaded.configPath,
      dryRun: options.dryRun ?? false,
      resources: resources.length,
      diagnostics,
      files: {
        planned,
      },
    },
  }
}

function assertNoDuplicateGeneratedPaths(entries: Array<{ name: string; filesToWrite: GeneratedFile[] }>): void {
  const owners = new Map<string, string>()
  const conflicts: string[] = []
  for (const entry of entries) {
    for (const file of entry.filesToWrite) {
      const owner = owners.get(file.path)
      if (owner && owner !== entry.name) {
        conflicts.push(`${file.path} (${owner}, ${entry.name})`)
        continue
      }
      owners.set(file.path, entry.name)
    }
  }

  if (conflicts.length > 0) {
    throw new Error(
      `Multi-schema generation would write duplicate paths: ${conflicts.slice(0, 5).join(', ')}. Set a distinct output.generatedDir for each input.`,
    )
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

function sumWriteResults(results: WriteGeneratedFilesResult[]): {
  created: number
  updated: number
  unchanged: number
  protected: number
} {
  return results.reduce(
    (total, result) => ({
      created: total.created + result.created,
      updated: total.updated + result.updated,
      unchanged: total.unchanged + result.unchanged,
      protected: total.protected + result.protected,
    }),
    { created: 0, updated: 0, unchanged: 0, protected: 0 },
  )
}
