import { access } from 'node:fs/promises'
import { dirname, isAbsolute, join, resolve } from 'node:path'

import { loadForgeConfig, resolveForgeConfig, type ForgeConfig, type ResolvedForgeConfig } from '@archora/forge-config'

import { parseSchemaRequestHeaders, type SchemaRequestCliOptions } from './schema-request.js'

const configNames = ['archora-forge.config.ts', 'archora-forge.config.js', 'archora-forge.config.mjs', 'archora-forge.config.json']

export type CliConfigResult = {
  name?: string
  config: ResolvedForgeConfig
  schema: string
  configPath: string | null
  cwd: string
}

export async function loadCliConfig(
  schema: string | undefined,
  options: ({ config?: string; force?: boolean } & SchemaRequestCliOptions) = {},
): Promise<CliConfigResult> {
  const configPath = options.config ? resolve(options.config) : await discoverConfig(process.cwd())
  const loaded = configPath ? await loadForgeConfig(configPath) : ({ input: schema ?? '' } satisfies ForgeConfig)
  const input = schema ?? loaded.input
  if (!input) {
    throw new Error('OpenAPI schema path is required when no Archora Forge config is found.')
  }
  const inputBaseDir = configPath ? dirname(configPath) : process.cwd()
  const absoluteInput = isRemoteInput(input) ? input : isAbsolute(input) ? input : resolve(inputBaseDir, input)
  const baseDir = configPath ? dirname(configPath) : isRemoteInput(absoluteInput) ? process.cwd() : dirname(absoluteInput)
  const config = resolveForgeConfig({
    ...loaded,
    input,
    schemaRequest: mergeSchemaRequestHeaders(loaded.schemaRequest, options.schemaHeader),
    output: {
      ...loaded.output,
      generatedDir: resolveOutput(baseDir, loaded.output?.generatedDir),
      featuresDir: resolveOutput(baseDir, loaded.output?.featuresDir),
      pagesDir: resolveOutput(baseDir, loaded.output?.pagesDir),
      mocksDir: resolveOutput(baseDir, loaded.output?.mocksDir),
    },
    overwrite: {
      ...loaded.overwrite,
      custom: options.force ?? loaded.overwrite?.custom,
    },
  })

  return {
    config,
    schema: absoluteInput,
    configPath,
    cwd: baseDir,
  }
}

export async function loadCliConfigSet(
  schema: string | undefined,
  options: ({ config?: string; force?: boolean } & SchemaRequestCliOptions) = {},
): Promise<CliConfigResult[]> {
  if (schema) return [await loadCliConfig(schema, options)]

  const configPath = options.config ? resolve(options.config) : await discoverConfig(process.cwd())
  if (!configPath) return [await loadCliConfig(schema, options)]

  const loaded = await loadForgeConfig(configPath)
  if (!loaded.inputs || loaded.inputs.length === 0) return [await loadCliConfig(schema, options)]

  const baseDir = dirname(configPath)
  return loaded.inputs.map((input) => {
    const absoluteInput = isRemoteInput(input.path) ? input.path : isAbsolute(input.path) ? input.path : resolve(baseDir, input.path)
    const output = {
      ...loaded.output,
      ...input.output,
    }
    const config = resolveForgeConfig({
      ...loaded,
      input: input.path,
      schemaRequest: mergeSchemaRequestHeaders(loaded.schemaRequest, options.schemaHeader),
      output: {
        ...output,
        generatedDir: resolveOutput(baseDir, output.generatedDir),
        featuresDir: resolveOutput(baseDir, output.featuresDir),
        pagesDir: resolveOutput(baseDir, output.pagesDir),
        mocksDir: resolveOutput(baseDir, output.mocksDir),
      },
      overwrite: {
        ...loaded.overwrite,
        custom: options.force ?? loaded.overwrite?.custom,
      },
    })

    return {
      name: input.name,
      config,
      schema: absoluteInput,
      configPath,
      cwd: baseDir,
    }
  })
}

async function discoverConfig(cwd: string): Promise<string | null> {
  for (const name of configNames) {
    const path = join(cwd, name)
    try {
      await access(path)
      return path
    } catch {
      continue
    }
  }

  return null
}

function resolveOutput(baseDir: string, value: string | undefined): string | undefined {
  if (!value) return undefined
  return isAbsolute(value) ? value : value.startsWith('./') ? value : join(baseDir, value)
}

function mergeSchemaRequestHeaders(
  schemaRequest: ForgeConfig['schemaRequest'],
  schemaHeader: string | string[] | undefined,
): ForgeConfig['schemaRequest'] {
  return {
    ...schemaRequest,
    headers: {
      ...schemaRequest?.headers,
      ...parseSchemaRequestHeaders(schemaHeader),
    },
  }
}

function isRemoteInput(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://')
}
