import { access } from 'node:fs/promises'
import { dirname, isAbsolute, join, resolve } from 'node:path'

import { loadForgeConfig, resolveForgeConfig, type ForgeConfig, type ResolvedForgeConfig } from '@archora/forge-config'

const configNames = ['archora-forge.config.ts', 'archora-forge.config.js', 'archora-forge.config.mjs', 'archora-forge.config.json']

export type CliConfigResult = {
  config: ResolvedForgeConfig
  schema: string
  configPath: string | null
  cwd: string
}

export async function loadCliConfig(schema: string | undefined, options: { config?: string; force?: boolean } = {}): Promise<CliConfigResult> {
  const configPath = options.config ? resolve(options.config) : await discoverConfig(process.cwd())
  const loaded = configPath ? await loadForgeConfig(configPath) : ({ input: schema ?? '' } satisfies ForgeConfig)
  const input = schema ?? loaded.input
  if (!input) {
    throw new Error('OpenAPI schema path is required when no Archora Forge config is found.')
  }
  const absoluteInput = isRemoteInput(input) ? input : isAbsolute(input) ? input : resolve(process.cwd(), input)
  const baseDir = configPath ? dirname(configPath) : isRemoteInput(absoluteInput) ? process.cwd() : dirname(absoluteInput)
  const config = resolveForgeConfig({
    ...loaded,
    input,
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

function isRemoteInput(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://')
}
