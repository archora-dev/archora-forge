import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, test } from 'vitest'

import * as adapters from '../packages/adapters/src/index.js'
import { createCli, defineForgeConfig, runCli } from '../packages/cli/src/index.js'
import * as config from '../packages/config/src/index.js'
import * as core from '../packages/core/src/index.js'
import * as runtime from '../packages/runtime/src/index.js'
import * as templates from '../packages/templates/src/index.js'

const basicCrudSchema = join(process.cwd(), 'test/fixtures/openapi/basic-crud.yaml')

describe('v1 public API contract', () => {
  test('keeps package runtime exports stable', () => {
    expect(Object.keys(adapters).sort()).toEqual([
      'mapMetadataField',
      'mapMetadataTableCell',
      'metadataFieldAdapter',
      'metadataTableAdapter',
      'toFilterFields',
      'toFormFields',
      'toTableColumns',
    ])
    expect(Object.keys(config).sort()).toEqual(['createForgeConfigPreset', 'defineForgeConfig', 'loadForgeConfig', 'resolveForgeConfig'])
    expect(Object.keys(core).sort()).toEqual([
      'ForgeError',
      'calculateDrift',
      'calculateSchemaHealth',
      'collectDiagnostics',
      'createGenerationPlan',
      'createIdentifierRegistry',
      'createOperationTypeNames',
      'createResourceTypeNames',
      'createResourceUiModel',
      'createSchemaCoverageMatrix',
      'createSharedSchemaTypes',
      'createTypeScriptTypes',
      'detectResources',
      'diffOpenApiContracts',
      'findPrunableGeneratedFiles',
      'forgeCoreVersion',
      'forgeGeneratedMarker',
      'forgeGeneratedMetadataMarker',
      'formatGeneratedContent',
      'getCollectionParams',
      'getHeaderParams',
      'getIdentityParams',
      'getOperationParams',
      'getPathParams',
      'getQueryParams',
      'isSafeIdentifier',
      'lintOpenApi',
      'loadTemplateOverride',
      'mergeSchemaCoverageMatrices',
      'normalizeOpenApi',
      'normalizePlugins',
      'parseOpenApi',
      'pluralizeTypeName',
      'pruneGeneratedFiles',
      'quoteObjectKeyIfNeeded',
      'readGeneratedFileMetadata',
      'resolveSchema',
      'resolveSchemaName',
      'runPluginAfterGenerateHooks',
      'runPluginArtifactHooks',
      'runPluginDiagnostics',
      'schemaToTypeScript',
      'summarizeFilePlan',
      'summarizeGeneratorMetadata',
      'toSafeFileName',
      'toSafeIdentifier',
      'toSafeTypeName',
      'toWritableGeneratedContent',
      'writeGeneratedFiles',
    ])
    expect(Object.keys(runtime).sort()).toEqual(['ForgeHttpError', 'createApiClient', 'createApiClientOptions', 'isForgeHttpError', 'queryParam'])
    expect(Object.keys(templates).sort()).toEqual(['createBarrelTemplate', 'createPermissionsTemplate'])
    expect(typeof createCli).toBe('function')
    expect(typeof runCli).toBe('function')
    expect(defineForgeConfig({ input: './openapi.yaml' })).toEqual({ input: './openapi.yaml' })
  })

  test('keeps generated file layout stable for the basic CRUD fixture', async () => {
    const normalized = core.normalizeOpenApi(await core.parseOpenApi(basicCrudSchema))
    const resources = core.detectResources(normalized.operations)
    const plan = await core.createGenerationPlan({
      config: config.resolveForgeConfig({ input: basicCrudSchema }),
      normalized,
      resources,
      cwd: process.cwd(),
    })

    expect(plan.files.map((file) => file.path).sort()).toEqual([
      'src/features/users/api/index.ts',
      'src/features/users/api/useCreateUserMutation.ts',
      'src/features/users/api/useDeleteUserMutation.ts',
      'src/features/users/api/useUpdateUserMutation.ts',
      'src/features/users/api/useUserQuery.ts',
      'src/features/users/api/useUsersQuery.ts',
      'src/features/users/model/index.ts',
      'src/features/users/model/users.config.ts',
      'src/features/users/model/users.i18n.ts',
      'src/features/users/model/users.permissions.ts',
      'src/shared/api/generated/components.types.ts',
      'src/shared/api/generated/users/index.ts',
      'src/shared/api/generated/users/users.client.ts',
      'src/shared/api/generated/users/users.query-keys.ts',
      'src/shared/api/generated/users/users.types.ts',
      'src/shared/mocks/users/index.ts',
      'src/shared/mocks/users/users.fixtures.ts',
      'src/shared/mocks/users/users.handlers.ts',
      'src/shared/mocks/users/users.scenarios.ts',
    ])
  })

  test('keeps CLI JSON report top-level shapes stable', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'archora-public-contract-'))

    await expectCliJsonKeys(cwd, ['inspect', basicCrudSchema, '--json'], [
      'ok',
      'schema',
      'configPath',
      'schemas',
      'resourceCount',
      'resources',
      'health',
      'diagnostics',
    ])
    await expectCliJsonKeys(cwd, ['validate', basicCrudSchema, '--json'], ['ok', 'schema', 'configPath', 'schemas', 'health', 'diagnostics'])
    await expectCliJsonKeys(cwd, ['lint', basicCrudSchema, '--json'], ['ok', 'schema', 'configPath', 'schemas', 'score', 'diagnostics'])
    await expectCliJsonKeys(cwd, ['generate', basicCrudSchema, '--dry-run', '--json'], [
      'ok',
      'schema',
      'configPath',
      'schemas',
      'dryRun',
      'resources',
      'diagnostics',
      'files',
      'prune',
    ])
    await expectCliJsonKeys(cwd, ['diff', basicCrudSchema, '--json'], ['ok', 'schema', 'configPath', 'schemas', 'resources', 'files'])
    await expectCliJsonKeys(cwd, ['impact', basicCrudSchema, basicCrudSchema, '--json'], [
      'ok',
      'oldSchema',
      'newSchema',
      'sourceUsages',
      'changes',
      'affectedResources',
      'affectedFiles',
      'changelog',
      'summary',
      'decision',
      'impactedSurface',
      'migrationHints',
      'prSummary',
    ])
    await expectCliJsonKeys(cwd, ['check', basicCrudSchema, '--json'], [
      'ok',
      'schema',
      'schemas',
      'healthScore',
      'resources',
      'generatedFiles',
      'protectedFiles',
      'failedChecks',
      'generator',
      'readiness',
      'drift',
      'diagnostics',
    ])
  })
})

async function expectCliJsonKeys(cwd: string, args: string[], keys: string[]): Promise<void> {
  const { output } = await runCliInDirectory(cwd, args)
  expect(Object.keys(JSON.parse(output))).toEqual(keys)
}

async function runCliInDirectory(cwd: string, args: string[]): Promise<{ exitCode: string | number | undefined; output: string }> {
  const previousExitCode = process.exitCode
  const previousCwd = process.cwd()
  const lines: string[] = []
  const originalLog = console.log
  process.exitCode = undefined
  console.log = (...values: unknown[]) => {
    lines.push(values.map(String).join(' '))
  }
  try {
    process.chdir(cwd)
    const cli = createCli()
    cli.parse(['node', 'archora-forge', ...args], { run: false })
    await cli.runMatchedCommand()

    return { exitCode: process.exitCode, output: lines.join('\n') }
  } finally {
    process.chdir(previousCwd)
    console.log = originalLog
    process.exitCode = previousExitCode
  }
}
