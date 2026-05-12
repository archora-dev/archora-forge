import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { describe, expect, test } from 'vitest'

import {
  calculateSchemaHealth,
  createGenerationPlan,
  detectResources,
  normalizeOpenApi,
  parseOpenApi,
  summarizeFilePlan,
} from '../packages/core/src/index.js'
import { loadForgeConfig, resolveForgeConfig } from '../packages/config/src/index.js'

const usersSchema = {
  openapi: '3.0.3',
  info: { title: 'Users API', version: '1.0.0' },
  tags: [{ name: 'Users' }],
  paths: {
    '/api/v1/users': {
      get: {
        operationId: 'listUsers',
        tags: ['Users'],
        responses: {
          '200': {
            description: 'Users',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/User' },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
      post: {
        operationId: 'createUser',
        tags: ['Users'],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateUserDto' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
        },
      },
    },
    '/api/v1/users/{userId}': {
      get: {
        operationId: 'getUser',
        tags: ['Users'],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'User',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
        },
      },
      patch: {
        operationId: 'updateUser',
        tags: ['Users'],
        responses: { '200': { description: 'Updated' } },
      },
      delete: {
        operationId: 'deleteUser',
        tags: ['Users'],
        responses: { '204': { description: 'Deleted' } },
      },
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
        },
      },
      CreateUserDto: {
        type: 'object',
        properties: {
          email: { type: 'string' },
        },
      },
    },
  },
}

describe('OpenAPI parsing and normalization', () => {
  test('parses OpenAPI JSON from disk', async () => {
    const dir = await createTempDir()
    const file = join(dir, 'openapi.json')
    await writeFile(file, JSON.stringify(usersSchema), 'utf8')

    const parsed = await parseOpenApi(file)

    expect(parsed.openapi).toBe('3.0.3')
    expect(parsed.info?.title).toBe('Users API')
  })

  test('parses OpenAPI YAML from disk', async () => {
    const dir = await createTempDir()
    const file = join(dir, 'openapi.yaml')
    await writeFile(file, 'openapi: 3.0.3\ninfo:\n  title: YAML API\n  version: 1.0.0\npaths: {}\n', 'utf8')

    const parsed = await parseOpenApi(file)

    expect(parsed.info?.title).toBe('YAML API')
  })

  test('normalizes operations, schemas and tags', () => {
    const normalized = normalizeOpenApi(usersSchema)

    expect(normalized.operations).toHaveLength(5)
    expect(normalized.operations[0]).toMatchObject({
      id: 'listUsers',
      method: 'get',
      path: '/api/v1/users',
      tags: ['Users'],
    })
    expect(normalized.schemas.map((schema) => schema.name)).toEqual(['User', 'CreateUserDto'])
    expect(normalized.tags).toEqual(['Users'])
  })
})

describe('resource detection and health', () => {
  test('detects CRUD resources behind API prefixes', () => {
    const normalized = normalizeOpenApi(usersSchema)
    const resources = detectResources(normalized.operations)

    expect(resources).toHaveLength(1)
    expect(resources[0]).toMatchObject({
      name: 'users',
      entity: 'User',
      isCrudCandidate: true,
      missing: [],
    })
    expect(Object.keys(resources[0]?.operations ?? {})).toEqual([
      'list',
      'create',
      'detail',
      'update',
      'delete',
    ])
  })

  test('calculates deterministic schema health report', () => {
    const normalized = normalizeOpenApi(usersSchema)
    const report = calculateSchemaHealth(normalized)

    expect(report.endpointCount).toBe(5)
    expect(report.schemaCount).toBe(2)
    expect(report.tagCount).toBe(1)
    expect(report.crudCandidateCount).toBe(1)
    expect(report.enumCount).toBe(1)
    expect(report.score).toBeGreaterThan(70)
    expect(report.warnings.some((warning) => warning.code === 'response-schema-missing')).toBe(true)
  })
})

describe('config and generation planning', () => {
  test('applies config defaults', () => {
    const resolved = resolveForgeConfig({ input: './openapi.yaml' })

    expect(resolved.output.generatedDir).toBe('./src/shared/api/generated')
    expect(resolved.target.framework).toBe('vue')
    expect(resolved.overwrite.generated).toBe(true)
    expect(resolved.overwrite.custom).toBe(false)
  })

  test('loads TypeScript config file', async () => {
    const dir = await createTempDir()
    const file = join(dir, 'archora-forge.config.ts')
    await writeFile(
      file,
      "import { defineForgeConfig } from '@archora/forge-config'\nexport default defineForgeConfig({ input: './schema.yaml' })\n",
      'utf8',
    )

    const loaded = await loadForgeConfig(file)

    expect(loaded.input).toBe('./schema.yaml')
  })

  test('creates generation plan and protects custom files', async () => {
    const dir = await createTempDir()
    const normalized = normalizeOpenApi(usersSchema)
    const resources = detectResources(normalized.operations)
    await mkdir(join(dir, 'src/features/users/ui'), { recursive: true })
    await writeFile(join(dir, 'src/features/users/ui/UsersTable.vue'), '<template />', 'utf8')

    const plan = await createGenerationPlan({
      config: resolveForgeConfig({ input: './openapi.yaml' }),
      normalized,
      resources,
      cwd: dir,
    })
    const summary = summarizeFilePlan(plan.files)

    expect(plan.files.some((file) => file.path.endsWith('users.client.ts'))).toBe(true)
    expect(summary.create).toBeGreaterThan(0)
    expect(summary.protected).toBe(1)
  })
})

async function createTempDir(): Promise<string> {
  const dir = await mkdir(join(tmpdir(), `archora-forge-${crypto.randomUUID()}`), { recursive: true })
  if (!dir) {
    throw new Error('Failed to create temp dir')
  }

  return dir
}
