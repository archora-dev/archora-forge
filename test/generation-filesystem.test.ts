import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { describe, expect, test } from 'vitest'

import {
  createGenerationPlan,
  calculateDrift,
  detectResources,
  findPrunableGeneratedFiles,
  readGeneratedFileMetadata,
  summarizeGeneratorMetadata,
  normalizeOpenApi,
  summarizeFilePlan,
  writeGeneratedFiles,
} from '../packages/core/src/index.js'
import { resolveForgeConfig } from '../packages/config/src/index.js'

const schema = {
  openapi: '3.0.3',
  info: { title: 'Module API', version: '1.0.0' },
  paths: {
    '/users': {
      get: { operationId: 'listUsers', tags: ['Users'], responses: { '200': { description: 'OK' } } },
      post: { operationId: 'createUser', tags: ['Users'], responses: { '201': { description: 'OK' } } },
    },
    '/users/{id}': {
      get: { operationId: 'getUser', tags: ['Users'], responses: { '200': { description: 'OK' } } },
      patch: { operationId: 'updateUser', tags: ['Users'], responses: { '200': { description: 'OK' } } },
      delete: { operationId: 'deleteUser', tags: ['Users'], responses: { '204': { description: 'OK' } } },
    },
  },
  components: {
    schemas: {
      User: {
        type: 'object',
        required: ['id', 'email'],
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          status: { type: 'string', enum: ['active', 'blocked'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
}

describe('framework-agnostic resource contract generation', () => {
  test('plans generated API, feature metadata and mock files without framework components', async () => {
    const normalized = normalizeOpenApi(schema)
    const resources = detectResources(normalized.operations)
    const plan = await createGenerationPlan({
      config: resolveForgeConfig({ input: './openapi.yaml' }),
      normalized,
      resources,
      cwd: await createTempDir(),
    })
    const paths = plan.files.map((file) => file.path).sort()

    expect(paths).toEqual(
      expect.arrayContaining([
        'src/shared/api/generated/users/users.client.ts',
        'src/shared/api/generated/users/users.types.ts',
        'src/shared/api/generated/users/users.query-keys.ts',
        'src/features/users/api/useUsersQuery.ts',
        'src/features/users/api/useCreateUserMutation.ts',
        'src/features/users/model/users.permissions.ts',
        'src/features/users/model/users.i18n.ts',
        'src/features/users/model/users.config.ts',
        'src/shared/mocks/users/users.fixtures.ts',
        'src/shared/mocks/users/users.handlers.ts',
      ]),
    )
    expect(paths.some((path) => path.endsWith('.vue'))).toBe(false)
    expect(paths).not.toContain('src/shared/ui/archora-ui.ts')
    expect(paths.some((path) => path.startsWith('src/pages/'))).toBe(false)
  })

  test('writes generated files without protecting removed framework wrappers', async () => {
    const cwd = await createTempDir()
    const normalized = normalizeOpenApi(schema)
    const plan = await createGenerationPlan({
      config: resolveForgeConfig({ input: './openapi.yaml' }),
      normalized,
      resources: detectResources(normalized.operations),
      cwd,
    })
    const result = await writeGeneratedFiles(plan.files, { cwd, dryRun: false })

    expect(result.created).toBeGreaterThan(10)
    expect(result.protected).toBe(0)
    await expect(readFile(join(cwd, 'src/shared/api/generated/users/users.client.ts'), 'utf8')).resolves.toContain(
      'listUsers',
    )
    expect(summarizeFilePlan(plan.files).protected).toBe(0)
  })

  test('marks generated TypeScript files as Forge-owned', async () => {
    const cwd = await createTempDir()
    const normalized = normalizeOpenApi(schema)
    const plan = await createGenerationPlan({
      config: resolveForgeConfig({ input: './openapi.yaml' }),
      normalized,
      resources: detectResources(normalized.operations),
      cwd,
    })

    await writeGeneratedFiles(plan.files, { cwd, dryRun: false })

    await expect(readFile(join(cwd, 'src/shared/api/generated/users/users.client.ts'), 'utf8')).resolves.toMatch(
      /^\/\/ @archora-forge-generated\n/,
    )
  })

  test('writes generated metadata with version, schema hash and config hash', async () => {
    const cwd = await createTempDir()
    const normalized = normalizeOpenApi(schema)
    const config = resolveForgeConfig({ input: './openapi.yaml' })
    const plan = await createGenerationPlan({
      config,
      normalized,
      resources: detectResources(normalized.operations),
      cwd,
    })

    await writeGeneratedFiles(plan.files, { cwd, dryRun: false })

    const content = await readFile(join(cwd, 'src/shared/api/generated/users/users.client.ts'), 'utf8')
    expect(content).toMatch(/^\/\/ @archora-forge-generated\n\/\/ @archora-forge-meta /)
    const metadata = readGeneratedFileMetadata(content)
    expect(metadata).toEqual(plan.files.find((file) => file.path.endsWith('users.client.ts'))?.metadata)
    expect(metadata?.version).toBe('1.4.0')
    expect(metadata?.schemaHash).toMatch(/^[a-f0-9]{12}$/)
    expect(metadata?.configHash).toMatch(/^[a-f0-9]{12}$/)
  })

  test('skips rewriting generated files when content is unchanged', async () => {
    const cwd = await createTempDir()
    const normalized = normalizeOpenApi(schema)
    const config = resolveForgeConfig({ input: './openapi.yaml' })
    const resources = detectResources(normalized.operations)
    const firstPlan = await createGenerationPlan({ config, normalized, resources, cwd })
    await writeGeneratedFiles(firstPlan.files, { cwd, dryRun: false })
    const secondPlan = await createGenerationPlan({ config, normalized, resources, cwd })

    const result = await writeGeneratedFiles(secondPlan.files, { cwd, dryRun: false })

    expect(result.unchanged).toBeGreaterThan(10)
    expect(result.updated).toBe(0)
    expect(result.created).toBe(0)
  })

  test('detects only marker-owned stale files under generated roots as prunable', async () => {
    const cwd = await createTempDir()
    const normalized = normalizeOpenApi(schema)
    const config = resolveForgeConfig({ input: './openapi.yaml' })
    const resources = detectResources(normalized.operations)
    const plan = await createGenerationPlan({ config, normalized, resources, cwd })
    await writeGeneratedFiles(plan.files, { cwd, dryRun: false })
    await mkdir(join(cwd, 'src/features/users/api'), { recursive: true })
    await writeFile(join(cwd, 'src/features/users/api/useLegacyUsersQuery.ts'), '// @archora-forge-generated\nexport const legacy = true\n', 'utf8')
    await writeFile(join(cwd, 'src/features/users/api/local-helper.ts'), 'export const local = true\n', 'utf8')

    const candidates = await findPrunableGeneratedFiles(plan.files, {
      cwd,
      roots: [config.output.generatedDir, config.output.featuresDir, config.output.mocksDir],
    })

    expect(candidates).toEqual([{ path: 'src/features/users/api/useLegacyUsersQuery.ts' }])
  })

  test('does not report drift after writing marker-owned generated files', async () => {
    const cwd = await createTempDir()
    const normalized = normalizeOpenApi(schema)
    const config = resolveForgeConfig({ input: './openapi.yaml' })
    const resources = detectResources(normalized.operations)
    const plan = await createGenerationPlan({ config, normalized, resources, cwd })

    await writeGeneratedFiles(plan.files, { cwd, dryRun: false })

    await expect(calculateDrift(plan.files, { cwd })).resolves.toEqual([])
  })

  test('summarizes missing and mismatched generated metadata', async () => {
    const cwd = await createTempDir()
    const normalized = normalizeOpenApi(schema)
    const config = resolveForgeConfig({ input: './openapi.yaml' })
    const resources = detectResources(normalized.operations)
    const plan = await createGenerationPlan({ config, normalized, resources, cwd })
    await writeGeneratedFiles(plan.files, { cwd, dryRun: false })
    await writeFile(
      join(cwd, 'src/shared/api/generated/users/users.client.ts'),
      '// @archora-forge-generated\n// @archora-forge-meta {"version":"0.9.0","schemaHash":"oldschema000","configHash":"oldconfig000"}\nexport const stale = true\n',
      'utf8',
    )
    await writeFile(
      join(cwd, 'src/shared/api/generated/users/users.types.ts'),
      '// @archora-forge-generated\nexport type Legacy = string\n',
      'utf8',
    )

    const summary = await summarizeGeneratorMetadata(plan.files, { cwd })

    expect(summary.status).toBe('mismatch')
    expect(summary.version).toBe('1.4.0')
    expect(summary.files.total).toBe(plan.files.filter((file) => file.kind === 'generated').length)
    expect(summary.files.missingMetadata).toEqual([{ path: 'src/shared/api/generated/users/users.types.ts' }])
    expect(summary.files.versionMismatches).toEqual([{ path: 'src/shared/api/generated/users/users.client.ts', expected: '1.4.0', actual: '0.9.0' }])
    expect(summary.files.schemaHashMismatches).toEqual([
      { path: 'src/shared/api/generated/users/users.client.ts', expected: plan.files[0]?.metadata?.schemaHash, actual: 'oldschema000' },
    ])
    expect(summary.files.configHashMismatches).toEqual([
      { path: 'src/shared/api/generated/users/users.client.ts', expected: plan.files[0]?.metadata?.configHash, actual: 'oldconfig000' },
    ])
  })
})

async function createTempDir(): Promise<string> {
  const dir = await mkdir(join(tmpdir(), `archora-forge-${crypto.randomUUID()}`), { recursive: true })
  if (!dir) {
    throw new Error('Failed to create temp dir')
  }

  return dir
}
