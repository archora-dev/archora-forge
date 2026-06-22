import { access } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

import type { ForgeResourceConfig } from '@archora/forge-config'

import type { NormalizedOpenApi } from '../openapi/openapi.types.js'
import { runPluginAfterGenerateHooks, runPluginArtifactHooks } from '../plugins/plugins.js'
import type { DetectedResource } from '../resources/resources.types.js'
import { operationComposableName } from './artifacts/composablesArtifact.js'
import { neutralComposables, type ComposableGenerators } from './artifacts/composableGenerators.js'
import { createClientArtifact } from './artifacts/clientArtifact.js'
import { createFixturesArtifact, createHandlersArtifact, createScenariosArtifact } from './artifacts/mocksArtifact.js'
import {
  createI18nArtifact,
  createPermissionsArtifact,
  createResourceConfigArtifact,
} from './artifacts/modelArtifacts.js'
import { createIndex } from './artifacts/indexArtifact.js'
import { createQueryKeysArtifact } from './artifacts/queryKeysArtifact.js'
import { createValidationSchemas } from './artifacts/validationArtifact.js'
import { formatGeneratedContent } from './formatGeneratedContent.js'
import type { GeneratedFile, GenerationPlan } from './generation.types.js'
import { pluralizeTypeName } from './identifiers.js'
import { createResourceUiModel, type ResourceUiModel } from './resourceUiModel.js'
import { loadTemplateOverride, type TemplateRegistry } from './templates.js'
import { createSharedSchemaTypes, createTypeScriptTypes } from './typeGeneration.js'
import { forgeCoreVersion } from '../version.js'

type ForgeGenerationConfig = {
  output: {
    generatedDir: string
    featuresDir: string
    mocksDir?: string
  }
  target?: {
    framework?: 'neutral'
    query?: 'promise' | 'tanstack-query' | 'vue-query' | 'svelte-query' | 'angular-query'
    ui?: 'metadata' | 'custom'
  }
  validation?: 'none' | 'zod' | 'valibot'
  plugins?: unknown[]
  overwrite: {
    custom: boolean
  }
  resources?: Record<string, ForgeResourceConfig>
  templates?: {
    override?: Partial<Record<'table' | 'form' | 'page' | 'permissions' | 'i18n', string>>
  }
}

export type CreateGenerationPlanInput = {
  config: ForgeGenerationConfig
  normalized: NormalizedOpenApi
  resources: DetectedResource[]
  cwd: string
  /** Feature composable generators; defaults to the framework-neutral promise helpers. */
  composables?: ComposableGenerators
}

export async function createGenerationPlan(input: CreateGenerationPlanInput): Promise<GenerationPlan> {
  const metadata = createGeneratedFileMetadata(input)
  const files: GeneratedFile[] = [
    await createFile(input.cwd, join(input.config.output.generatedDir, 'components.types.ts'), 'generated', createSharedSchemaTypes(input.normalized), true),
  ]
  const templateOverrides = await loadTemplateOverrides(input.config.templates?.override, input.cwd)
  const resolvedResources: DetectedResource[] = []

  for (const resource of input.resources) {
    if (input.config.resources?.[resource.name]?.enabled === false) continue
    const resolvedResource = applyResourceConfig(resource, input.config.resources?.[resource.name])
    resolvedResources.push(resolvedResource)
    files.push(...(await createResourceFiles(input, resolvedResource, templateOverrides)))
  }

  for (const artifact of await runPluginArtifactHooks({ plugins: input.config.plugins, normalized: input.normalized, cwd: input.cwd })) {
    files.push(await createFile(input.cwd, artifact.path, artifact.kind, artifact.content, artifact.overwrite))
  }

  await runPluginAfterGenerateHooks({ plugins: input.config.plugins, files })
  for (const file of files) {
    if (file.kind === 'generated') file.metadata = metadata
  }

  return {
    resources: resolvedResources.map((resource) => ({
      ...resource,
      outputName: resource.name,
      permissions: {
        view: `${resource.name}.read`,
        create: `${resource.name}.create`,
        update: `${resource.name}.update`,
        delete: `${resource.name}.delete`,
      },
    })),
    files,
  }
}

function createGeneratedFileMetadata(input: CreateGenerationPlanInput): NonNullable<GeneratedFile['metadata']> {
  return {
    version: forgeCoreVersion,
    schemaHash: stableHash(input.normalized),
    configHash: stableHash({
      output: input.config.output,
      target: input.config.target,
      validation: input.config.validation,
      resources: input.config.resources,
      templates: input.config.templates,
    }),
  }
}

function stableHash(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex').slice(0, 12)
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function applyResourceConfig(resource: DetectedResource, config: ForgeResourceConfig | undefined): DetectedResource {
  return {
    ...resource,
    entity: config?.entity ?? resource.entity,
  }
}

async function createResourceFiles(
  input: CreateGenerationPlanInput,
  resource: DetectedResource,
  templateOverrides: TemplateRegistry,
): Promise<GeneratedFile[]> {
  const uiModel = createResourceUiModel({
    normalized: input.normalized,
    resource,
    config: input.config.resources?.[resource.name],
  })
  const paths = resourcePaths(input.config, resource)
  const validation = input.config.validation ?? 'none'
  const apiExports = [`${resource.name}.client`, `${resource.name}.types`, `${resource.name}.query-keys`]
  const validationArtifact = validation === 'none' ? null : createValidationSchemas(input.normalized, resource.name, resource, validation)
  if (validationArtifact) apiExports.push(`${resource.name}.validation`)

  const generatedFiles: Array<[string, string]> = [
    [join(paths.apiDir, `${resource.name}.client.ts`), createClientArtifact(input.normalized, resource.name, resource)],
    [join(paths.apiDir, `${resource.name}.types.ts`), createTypeScriptTypes(input.normalized, resource)],
    [join(paths.apiDir, `${resource.name}.query-keys.ts`), createQueryKeysArtifact(resource.name, resource)],
    ...(validationArtifact ? ([[join(paths.apiDir, `${resource.name}.validation.ts`), validationArtifact]] as Array<[string, string]>) : []),
    [join(paths.apiDir, 'index.ts'), createIndex(apiExports)],
    ...createFeatureApiFiles(paths.featureApiDir, resource.name, resource, input.composables ?? neutralComposables),
    ...await createModelFiles(input, resource, paths.featureModelDir, uiModel, templateOverrides),
    ...createMockFiles(paths.mocksDir, resource),
  ]

  return Promise.all(generatedFiles.map(([path, content]) => createFile(input.cwd, path, 'generated', content, true)))
}

function createFeatureApiFiles(featureApiDir: string, resourceName: string, resource: DetectedResource, composables: ComposableGenerators): Array<[string, string]> {
  const entity = resource.entity
  const collection = pluralizeTypeName(entity)
  const crudComposables: Array<[string, string]> = []
  const crudExports: string[] = []

  if (resource.operations.list?.id) {
    crudComposables.push([join(featureApiDir, `use${collection}Query.ts`), composables.list(resourceName, resource)])
    crudExports.push(`use${collection}Query`)
  }
  if (resource.operations.detail?.id) {
    crudComposables.push([join(featureApiDir, `use${entity}Query.ts`), composables.detail(resourceName, resource)])
    crudExports.push(`use${entity}Query`)
  }
  if (resource.operations.create?.id) {
    crudComposables.push([join(featureApiDir, `useCreate${entity}Mutation.ts`), composables.createMutation(resourceName, resource)])
    crudExports.push(`useCreate${entity}Mutation`)
  }
  if (resource.operations.update?.id) {
    crudComposables.push([join(featureApiDir, `useUpdate${entity}Mutation.ts`), composables.updateMutation(resourceName, resource)])
    crudExports.push(`useUpdate${entity}Mutation`)
  }
  if (resource.operations.delete?.id) {
    crudComposables.push([join(featureApiDir, `useDelete${entity}Mutation.ts`), composables.deleteMutation(resourceName, resource)])
    crudExports.push(`useDelete${entity}Mutation`)
  }

  const generatedOperations = resource.operationsList.filter((operation) => isGeneratedOperation(resource, operation))
  const operationComposables = generatedOperations.map((operation) => {
    const composableName = operationComposableName(operation)
    return [join(featureApiDir, `${composableName}.ts`), composables.operation(resourceName, operation)] as [string, string]
  })
  const operationExports = generatedOperations.map(operationComposableName)
  const exports = [...crudExports, ...operationExports]

  return [...crudComposables, ...operationComposables, ...(exports.length > 0 ? ([[join(featureApiDir, 'index.ts'), createIndex(exports)]] as Array<[string, string]>) : [])]
}

function isGeneratedOperation(resource: DetectedResource, operation: DetectedResource['operationsList'][number]): boolean {
  return operation.operationKind !== 'unsupported-operation' && Boolean(operation.id) && !Object.values(resource.operations).includes(operation)
}

async function createModelFiles(
  input: CreateGenerationPlanInput,
  resource: DetectedResource,
  featureModelDir: string,
  uiModel: ResourceUiModel,
  templateOverrides: TemplateRegistry,
): Promise<Array<[string, string]>> {
  const config = input.config.resources?.[resource.name]
  return [
    [join(featureModelDir, `${resource.name}.permissions.ts`), createPermissionsArtifact(resource.name, config)],
    [join(featureModelDir, `${resource.name}.i18n.ts`), await renderTemplate(templateOverrides.i18n, input.cwd, resource, uiModel, () => createI18nArtifact(resource.name, resource.entity, uiModel))],
    [join(featureModelDir, `${resource.name}.config.ts`), createResourceConfigArtifact(resource.name, uiModel)],
    [join(featureModelDir, 'index.ts'), createIndex([`${resource.name}.permissions`, `${resource.name}.i18n`, `${resource.name}.config`])],
  ]
}

function createMockFiles(mocksDir: string, resource: DetectedResource): Array<[string, string]> {
  return [
    [join(mocksDir, `${resource.name}.fixtures.ts`), createFixturesArtifact(resource.name, resource.entity)],
    [join(mocksDir, `${resource.name}.handlers.ts`), createHandlersArtifact(resource.name)],
    [join(mocksDir, `${resource.name}.scenarios.ts`), createScenariosArtifact(resource.name)],
    [join(mocksDir, 'index.ts'), createIndex([`${resource.name}.fixtures`, `${resource.name}.handlers`, `${resource.name}.scenarios`])],
  ]
}

function resourcePaths(config: ForgeGenerationConfig, resource: DetectedResource) {
  return {
    apiDir: join(config.output.generatedDir, resource.name),
    featureApiDir: join(config.output.featuresDir, resource.name, 'api'),
    featureModelDir: join(config.output.featuresDir, resource.name, 'model'),
    mocksDir: join(config.output.mocksDir ?? './src/shared/mocks', resource.name),
  }
}

async function loadTemplateOverrides(overrides: NonNullable<ForgeGenerationConfig['templates']>['override'] | undefined, cwd: string): Promise<TemplateRegistry> {
  const registry: TemplateRegistry = {}
  for (const [key, path] of Object.entries(overrides ?? {}) as Array<[keyof TemplateRegistry, string]>) {
    registry[key] = await loadTemplateOverride(path, cwd)
  }

  return registry
}

async function renderTemplate(
  template: TemplateRegistry[keyof TemplateRegistry] | undefined,
  cwd: string,
  resource: DetectedResource,
  uiModel: ResourceUiModel,
  fallback: () => string,
): Promise<string> {
  return template ? template({ cwd, resource, uiModel }) : fallback()
}

export function summarizeFilePlan(files: GeneratedFile[]): { create: number; update: number; protected: number } {
  return files.reduce(
    (summary, file) => {
      if (file.exists && !file.overwrite) summary.protected += 1
      else if (file.exists) summary.update += 1
      else summary.create += 1
      return summary
    },
    { create: 0, update: 0, protected: 0 },
  )
}

async function createFile(
  cwd: string,
  path: string,
  kind: GeneratedFile['kind'],
  content: string,
  overwrite: boolean,
): Promise<GeneratedFile> {
  const exists = await fileExists(join(cwd, path))

  return {
    path,
    content: await formatGeneratedContent(path, content),
    kind,
    overwrite,
    exists,
  }
}

async function fileExists(path: string): Promise<boolean> {
  return access(path)
    .then(() => true)
    .catch(() => false)
}
