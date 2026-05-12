import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

import { createJiti } from 'jiti'

export type ForgeOutputConfig = {
  root?: string
  generatedDir?: string
  featuresDir?: string
  pagesDir?: string
  mocksDir?: string
}

export type ForgeConfig = {
  input: string
  inputs?: Array<{
    name: string
    path: string
    basePath?: string
    output?: ForgeOutputConfig
  }>
  output?: ForgeOutputConfig
  target?: {
    framework?: 'vue' | 'nuxt'
    language?: 'typescript'
    query?: 'promise' | 'tanstack-vue-query'
    ui?: 'fallback' | 'archora-ui' | 'vanilla-ts' | 'custom'
    architecture?: 'feature-sliced' | 'simple' | 'custom'
  }
  validation?: 'none' | 'zod' | 'valibot'
  mocks?: {
    adapter?: 'none' | 'simple' | 'msw'
  }
  schemaRequest?: {
    headers?: Record<string, string>
    timeoutMs?: number
  }
  plugins?: unknown[]
  templates?: {
    directory?: string
    override?: Partial<Record<'table' | 'form' | 'page' | 'permissions' | 'i18n', string>>
  }
  uiAdapter?: {
    imports?: Record<string, string>
    fields?: Record<string, string>
    cells?: Record<string, string>
  }
  naming?: {
    resourceCase?: 'kebab' | 'camel' | 'pascal'
    fileCase?: 'kebab' | 'camel' | 'pascal'
    componentPrefix?: string
    generatedSuffix?: string
  }
  ci?: {
    failOnWarnings?: boolean
    failOnUnsupportedFeatures?: boolean
    failOnMissingSchemas?: boolean
    failOnDrift?: boolean
  }
  resources?: Record<string, ForgeResourceConfig>
  overwrite?: {
    generated?: boolean
    custom?: boolean
  }
}

export type ForgeResourceConfig = {
  enabled?: boolean
  entity?: string
  endpoints?: Partial<Record<'list' | 'detail' | 'create' | 'update' | 'delete', string>>
  table?: {
    columns?: string[]
    filters?: string[]
  }
  form?: {
    fields?: string[]
    layout?: 'drawer' | 'modal' | 'page'
  }
  permissions?: Partial<Record<'view' | 'create' | 'update' | 'delete', string>>
}

export function defineForgeConfig(config: ForgeConfig): ForgeConfig {
  return config
}

export type ResolvedForgeConfig = {
  input: string
  inputs: NonNullable<ForgeConfig['inputs']>
  output: {
    root: string
    generatedDir: string
    featuresDir: string
    pagesDir: string
    mocksDir: string
  }
  target: {
    framework: 'vue' | 'nuxt'
    language: 'typescript'
    query: 'promise' | 'tanstack-vue-query'
    ui: 'fallback' | 'archora-ui' | 'vanilla-ts' | 'custom'
    architecture: 'feature-sliced' | 'simple' | 'custom'
  }
  validation: 'none' | 'zod' | 'valibot'
  mocks: {
    adapter: 'none' | 'simple' | 'msw'
  }
  schemaRequest: {
    headers: Record<string, string>
    timeoutMs: number
  }
  plugins: unknown[]
  templates: NonNullable<ForgeConfig['templates']>
  uiAdapter: NonNullable<ForgeConfig['uiAdapter']>
  naming: {
    resourceCase: 'kebab' | 'camel' | 'pascal'
    fileCase: 'kebab' | 'camel' | 'pascal'
    componentPrefix: string
    generatedSuffix: string
  }
  ci: {
    failOnWarnings: boolean
    failOnUnsupportedFeatures: boolean
    failOnMissingSchemas: boolean
    failOnDrift: boolean
  }
  resources: Record<string, ForgeResourceConfig>
  overwrite: {
    generated: boolean
    custom: boolean
  }
}

export function resolveForgeConfig(config: ForgeConfig): ResolvedForgeConfig {
  return {
    input: config.input,
    inputs: config.inputs ?? [],
    output: {
      root: config.output?.root ?? './src',
      generatedDir: config.output?.generatedDir ?? './src/shared/api/generated',
      featuresDir: config.output?.featuresDir ?? './src/features',
      pagesDir: config.output?.pagesDir ?? './src/pages',
      mocksDir: config.output?.mocksDir ?? './src/shared/mocks',
    },
    target: {
      framework: config.target?.framework ?? 'vue',
      language: config.target?.language ?? 'typescript',
      query: config.target?.query ?? 'promise',
      ui: config.target?.ui ?? 'fallback',
      architecture: config.target?.architecture ?? 'feature-sliced',
    },
    validation: config.validation ?? 'none',
    mocks: {
      adapter: config.mocks?.adapter ?? 'simple',
    },
    schemaRequest: {
      headers: interpolateHeaders(config.schemaRequest?.headers ?? {}),
      timeoutMs: config.schemaRequest?.timeoutMs ?? 30_000,
    },
    plugins: config.plugins ?? [],
    templates: config.templates ?? {},
    uiAdapter: config.uiAdapter ?? {},
    naming: {
      resourceCase: config.naming?.resourceCase ?? 'kebab',
      fileCase: config.naming?.fileCase ?? 'pascal',
      componentPrefix: config.naming?.componentPrefix ?? '',
      generatedSuffix: config.naming?.generatedSuffix ?? '.generated',
    },
    ci: {
      failOnWarnings: config.ci?.failOnWarnings ?? false,
      failOnUnsupportedFeatures: config.ci?.failOnUnsupportedFeatures ?? true,
      failOnMissingSchemas: config.ci?.failOnMissingSchemas ?? false,
      failOnDrift: config.ci?.failOnDrift ?? true,
    },
    resources: config.resources ?? {},
    overwrite: {
      generated: config.overwrite?.generated ?? true,
      custom: config.overwrite?.custom ?? false,
    },
  }
}

function interpolateHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      value.replace(/\$\{([A-Z0-9_]+)\}/gi, (_, name: string) => process.env[name] ?? ''),
    ]),
  )
}

export async function loadForgeConfig(filePath: string): Promise<ForgeConfig> {
  if (filePath.endsWith('.json')) {
    return parseConfig(JSON.parse(await readFile(filePath, 'utf8')))
  }

  const jiti = createJiti(import.meta.url, {
    interopDefault: true,
    moduleCache: false,
  })
  try {
    const loaded = await jiti.import(pathToFileURL(filePath).href, { default: true })

    return parseConfig(loaded)
  } catch (error) {
    const source = await readFile(filePath, 'utf8')
    const fallback = loadConfigFromSource(source)
    if (fallback) {
      return fallback
    }

    throw error
  }
}

function parseConfig(value: unknown): ForgeConfig {
  if (!isForgeConfig(value)) {
    throw new Error('Invalid Archora Forge config: `input` must be a string.')
  }

  return value
}

function isForgeConfig(value: unknown): value is ForgeConfig {
  return typeof value === 'object' && value !== null && 'input' in value && typeof value.input === 'string'
}

function loadConfigFromSource(source: string): ForgeConfig | null {
  const match = source.match(/export\s+default\s+defineForgeConfig\(([\s\S]*)\)\s*;?\s*$/)
  if (!match?.[1]) {
    return null
  }

  const createConfig = new Function('defineForgeConfig', `return defineForgeConfig(${match[1]})`) as (
    helper: typeof defineForgeConfig,
  ) => unknown

  return parseConfig(createConfig(defineForgeConfig))
}
