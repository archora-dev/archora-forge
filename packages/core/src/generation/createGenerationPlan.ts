import { access } from 'node:fs/promises'
import { join } from 'node:path'

import type { ForgeResourceConfig } from '@archora/forge-config'

import type { NormalizedOpenApi } from '../openapi/openapi.types.js'
import { runPluginAfterGenerateHooks, runPluginArtifactHooks } from '../plugins/plugins.js'
import type { DetectedResource } from '../resources/resources.types.js'
import {
  createCreateMutation,
  createDeleteMutation,
  createDetailComposable,
  createListComposable,
  createOperationComposable,
  createUpdateMutation,
  operationComposableName,
} from './artifacts/composablesArtifact.js'
import { createClientArtifact } from './artifacts/clientArtifact.js'
import { createFixturesArtifact, createHandlersArtifact, createScenariosArtifact } from './artifacts/mocksArtifact.js'
import {
  createI18nArtifact,
  createPermissionsArtifact,
  createResourceConfigArtifact,
  createRoutesArtifact,
} from './artifacts/modelArtifacts.js'
import { createDrawerArtifact, createDeleteConfirmArtifact } from './artifacts/shellArtifacts.js'
import { createFormArtifact } from './artifacts/formArtifact.js'
import { createIndex } from './artifacts/indexArtifact.js'
import { createPageArtifact } from './artifacts/pageArtifact.js'
import { createQueryKeysArtifact } from './artifacts/queryKeysArtifact.js'
import { createTableArtifact } from './artifacts/tableArtifact.js'
import { createUiAdapter } from './artifacts/uiAdapterArtifact.js'
import { createValidationSchemas } from './artifacts/validationArtifact.js'
import { formatGeneratedContent } from './formatGeneratedContent.js'
import type { GeneratedFile, GenerationPlan } from './generation.types.js'
import { createResourceUiModel, type ResourceUiModel } from './resourceUiModel.js'
import { loadTemplateOverride, type TemplateRegistry } from './templates.js'
import { createSharedSchemaTypes, createTypeScriptTypes } from './typeGeneration.js'

type ForgeGenerationConfig = {
  output: {
    generatedDir: string
    featuresDir: string
    pagesDir?: string
    mocksDir?: string
  }
  target?: {
    framework?: 'vue' | 'nuxt'
    query?: 'promise' | 'tanstack-vue-query'
    ui?: 'fallback' | 'archora-ui' | 'vanilla-ts' | 'custom'
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
}

export async function createGenerationPlan(input: CreateGenerationPlanInput): Promise<GenerationPlan> {
  const files: GeneratedFile[] = [
    await createFile(input.cwd, join('./src/shared/ui', 'archora-ui.ts'), 'generated', createUiAdapter(input.config.target?.ui ?? 'fallback'), true),
    await createFile(input.cwd, join(input.config.output.generatedDir, 'components.types.ts'), 'generated', createSharedSchemaTypes(input.normalized), true),
  ]
  const templateOverrides = await loadTemplateOverrides(input.config.templates?.override, input.cwd)

  for (const resource of input.resources) {
    if (input.config.resources?.[resource.name]?.enabled === false) continue
    files.push(...(await createResourceFiles(input, resource, templateOverrides)))
  }

  for (const artifact of await runPluginArtifactHooks({ plugins: input.config.plugins, normalized: input.normalized, cwd: input.cwd })) {
    files.push(await createFile(input.cwd, artifact.path, artifact.kind, artifact.content, artifact.overwrite))
  }

  await runPluginAfterGenerateHooks({ plugins: input.config.plugins, files })

  return {
    resources: input.resources.map((resource) => ({
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
  const queryMode = input.config.target?.query ?? 'promise'
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
    ...createFeatureApiFiles(paths.featureApiDir, resource.name, resource, queryMode),
    ...await createModelFiles(input, resource, paths.featureModelDir, uiModel, templateOverrides),
    ...await createUiFiles(input, resource, paths.featureUiDir, uiModel, templateOverrides),
    ...await createPageFiles(input, resource, paths.pagesDir, uiModel, templateOverrides),
    ...createMockFiles(paths.mocksDir, resource),
  ]

  const files = await Promise.all(generatedFiles.map(([path, content]) => createFile(input.cwd, path, 'generated', content, true)))
  files.push(await createCustomTableWrapper(input, paths.featureUiDir, resource))

  return files
}

function createFeatureApiFiles(featureApiDir: string, resourceName: string, resource: DetectedResource, queryMode: 'promise' | 'tanstack-vue-query'): Array<[string, string]> {
  const entity = resource.entity
  const operationComposables = resource.operationsList.filter(isGeneratedOperation).map((operation) => {
    const composableName = operationComposableName(operation)
    return [join(featureApiDir, `${composableName}.ts`), createOperationComposable(resourceName, operation, queryMode)] as [string, string]
  })
  const operationExports = resource.operationsList.filter(isGeneratedOperation).map(operationComposableName)

  return [
    [join(featureApiDir, `use${entity}sQuery.ts`), createListComposable(resourceName, resource, queryMode)],
    [join(featureApiDir, `use${entity}Query.ts`), createDetailComposable(resourceName, resource, queryMode)],
    [join(featureApiDir, `useCreate${entity}Mutation.ts`), createCreateMutation(resourceName, resource, queryMode)],
    [join(featureApiDir, `useUpdate${entity}Mutation.ts`), createUpdateMutation(resourceName, resource, queryMode)],
    [join(featureApiDir, `useDelete${entity}Mutation.ts`), createDeleteMutation(resourceName, resource, queryMode)],
    ...operationComposables,
    [join(featureApiDir, 'index.ts'), createIndex([`use${entity}sQuery`, `use${entity}Query`, `useCreate${entity}Mutation`, `useUpdate${entity}Mutation`, `useDelete${entity}Mutation`, ...operationExports])],
  ]
}

function isGeneratedOperation(operation: DetectedResource['operationsList'][number]): boolean {
  return operation.operationKind !== 'crud-resource' && operation.operationKind !== 'unsupported-operation' && Boolean(operation.id)
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

async function createUiFiles(
  input: CreateGenerationPlanInput,
  resource: DetectedResource,
  featureUiDir: string,
  uiModel: ResourceUiModel,
  templateOverrides: TemplateRegistry,
): Promise<Array<[string, string]>> {
  const entity = resource.entity
  return [
    [join(featureUiDir, `${entity}sTable.generated.vue`), await renderTemplate(templateOverrides.table, input.cwd, resource, uiModel, () => createTableArtifact(entity, resource.name, uiModel, resource))],
    [join(featureUiDir, `${entity}Form.generated.vue`), await renderTemplate(templateOverrides.form, input.cwd, resource, uiModel, () => createFormArtifact(entity, uiModel))],
    [join(featureUiDir, `${entity}Drawer.generated.vue`), createDrawerArtifact(entity)],
    [join(featureUiDir, `Delete${entity}Confirm.generated.vue`), createDeleteConfirmArtifact(entity)],
  ]
}

async function createPageFiles(
  input: CreateGenerationPlanInput,
  resource: DetectedResource,
  pagesDir: string,
  uiModel: ResourceUiModel,
  templateOverrides: TemplateRegistry,
): Promise<Array<[string, string]>> {
  const entity = resource.entity
  return [
    [join(pagesDir, `${entity}sPage.generated.vue`), await renderTemplate(templateOverrides.page, input.cwd, resource, uiModel, () => createPageArtifact(entity, resource.name, uiModel))],
    [join(pagesDir, `${resource.name}.routes.ts`), createRoutesArtifact(resource.name, entity)],
    [join(pagesDir, 'index.ts'), `export { default as ${entity}sPageGenerated } from './${entity}sPage.generated.vue'\nexport * from './${resource.name}.routes'\n`],
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
    featureUiDir: join(config.output.featuresDir, resource.name, 'ui'),
    pagesDir: join(config.output.pagesDir ?? './src/pages', resource.name),
    mocksDir: join(config.output.mocksDir ?? './src/shared/mocks', resource.name),
  }
}

async function createCustomTableWrapper(input: CreateGenerationPlanInput, featureUiDir: string, resource: DetectedResource): Promise<GeneratedFile> {
  const entity = resource.entity
  return createFile(
    input.cwd,
    join(featureUiDir, `${entity}sTable.vue`),
    'custom',
    `<script setup lang="ts">\nimport ${entity}sTableGenerated from './${entity}sTable.generated.vue'\n\ndefineProps<{\n  rows?: Record<string, unknown>[]\n  loading?: boolean\n  error?: string | null\n}>()\n</script>\n\n<template>\n  <${entity}sTableGenerated :rows="rows" :loading="loading" :error="error" />\n</template>\n`,
    input.config.overwrite.custom,
  )
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
