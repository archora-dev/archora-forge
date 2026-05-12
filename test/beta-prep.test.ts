import { mkdir, readFile as readTextFile, symlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { describe, expect, test } from 'vitest'

import { resolveForgeConfig } from '../packages/config/src/index.js'
import {
  collectDiagnostics,
  createGenerationPlan,
  detectResources,
  diffOpenApiContracts,
  lintOpenApi,
  normalizeOpenApi,
  parseOpenApi,
  type ForgePlugin,
} from '../packages/core/src/index.js'
import { createApiClient } from '../packages/runtime/src/index.js'

const execFileAsync = promisify(execFile)

const crudSchema = {
  openapi: '3.0.3',
  info: { title: 'Demo API', version: '1.0.0' },
  paths: {
    '/users': {
      get: {
        operationId: 'listUsers',
        tags: ['Users'],
        parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }],
        responses: {
          '200': {
            description: 'Users',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['items', 'total'],
                  properties: {
                    items: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
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
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
        },
      },
    },
    '/users/{id}': {
      get: {
        operationId: 'getUser',
        tags: ['Users'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'User',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
        },
      },
      patch: {
        operationId: 'updateUser',
        tags: ['Users'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateUserDto' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
        },
      },
      delete: {
        operationId: 'deleteUser',
        tags: ['Users'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '204': { description: 'Deleted' } },
      },
    },
  },
  components: {
    schemas: {
      User: {
        type: 'object',
        required: ['id', 'email', 'status'],
        properties: {
          id: { type: 'string', readOnly: true },
          email: { type: 'string', format: 'email', minLength: 3, maxLength: 120 },
          status: { type: 'string', enum: ['active', 'blocked'] },
          score: { type: 'number', minimum: 0, maximum: 100 },
          verified: { type: 'boolean', nullable: true },
        },
      },
      CreateUserDto: {
        type: 'object',
        required: ['email', 'status'],
        properties: {
          email: { type: 'string', format: 'email', minLength: 3, maxLength: 120 },
          status: { type: 'string', enum: ['active', 'blocked'] },
          score: { type: 'number', minimum: 0, maximum: 100 },
          verified: { type: 'boolean', nullable: true },
        },
      },
      UpdateUserDto: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          status: { type: 'string', enum: ['active', 'blocked'] },
        },
      },
    },
  },
}

describe('Beta-prep core additions', () => {
  test('generation orchestration stays below blocker size after artifact extraction', async () => {
    const source = await readTextFile(join(process.cwd(), 'packages/core/src/generation/createGenerationPlan.ts'), 'utf8')

    expect(source.split('\n').length).toBeLessThanOrEqual(320)
    expect(source).not.toContain('function createClient(')
    expect(source).not.toContain('function createForm(')
    expect(source).not.toContain('function createTable(')
  })

  test('runtime auth presets merge bearer, api key and custom headers safely', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const fetchImpl: typeof fetch = async (url, init) => {
      calls.push({ url: String(url), init: init ?? {} })
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    const bearerClient = createApiClient({
      baseUrl: 'https://api.test',
      headers: { 'x-static': 'yes' },
      getHeaders: async () => ({ 'x-dynamic': 'yes' }),
      auth: { type: 'bearer', token: async () => 'token-123' },
      fetchImpl,
    })
    const apiKeyClient = createApiClient({
      baseUrl: 'https://api.test',
      auth: { type: 'apiKey', headerName: 'x-api-key', value: () => 'key-123' },
      fetchImpl,
    })

    await bearerClient.request('GET', '/secure', { headers: { 'x-local': 'yes' } })
    await apiKeyClient.request('GET', '/keyed')

    expect(calls[0]?.init.headers).toMatchObject({
      authorization: 'Bearer token-123',
      'x-static': 'yes',
      'x-dynamic': 'yes',
      'x-local': 'yes',
    })
    expect(calls[1]?.init.headers).toMatchObject({ 'x-api-key': 'key-123' })
  })

  test('remote OpenAPI loading supports headers, YAML parsing and readable HTTP errors', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const fetchImpl: typeof fetch = async (url, init) => {
      calls.push({ url: String(url), init: init ?? {} })
      if (String(url).endsWith('/broken.yaml')) {
        return new Response('nope', { status: 503, statusText: 'Unavailable' })
      }
      return new Response('openapi: 3.0.3\ninfo:\n  title: Remote API\n  version: 1.0.0\npaths: {}\n', {
        status: 200,
        headers: { 'content-type': 'application/yaml' },
      })
    }

    await expect(
      parseOpenApi('https://contracts.test/openapi.yaml', {
        fetchImpl,
        headers: { authorization: 'Bearer secret' },
        timeoutMs: 1_000,
      }),
    ).resolves.toMatchObject({ info: { title: 'Remote API' } })
    await expect(parseOpenApi('https://contracts.test/broken.yaml', { fetchImpl })).rejects.toThrow(
      'Failed to fetch OpenAPI schema',
    )
    expect(calls[0]?.init.headers).toMatchObject({ authorization: 'Bearer secret' })
  })

  test('simple allOf object schemas merge while unsafe composition is diagnosed', async () => {
    const schema = {
      ...crudSchema,
      components: {
        schemas: {
          BaseUser: {
            type: 'object',
            required: ['id'],
            properties: { id: { type: 'string' } },
          },
          User: {
            allOf: [
              { $ref: '#/components/schemas/BaseUser' },
              {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email' } },
              },
            ],
          },
          Conflicting: {
            allOf: [
              { type: 'object', properties: { id: { type: 'string' } } },
              { type: 'object', properties: { id: { type: 'number' } } },
            ],
          },
          Polymorphic: {
            oneOf: [{ type: 'string' }, { type: 'number' }],
            discriminator: { propertyName: 'type' },
          },
        },
      },
    }

    const normalized = normalizeOpenApi(schema)
    const user = normalized.schemas.find((candidate) => candidate.name === 'User')?.schema
    const diagnostics = collectDiagnostics(normalized)

    expect(user?.properties).toMatchObject({ id: { type: 'string' }, email: { type: 'string', format: 'email' } })
    expect(user?.required).toEqual(['id', 'email'])
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(['supported-allof-object-merge', 'conflicting-allof', 'unsupported-oneof', 'unsupported-discriminator']),
    )
  })

  test('tanstack query and zod validation modes generate opt-in artifacts without changing promise default', async () => {
    const normalized = normalizeOpenApi(crudSchema)
    const resources = detectResources(normalized.operations)
    const promisePlan = await createGenerationPlan({
      config: resolveForgeConfig({ input: './openapi.yaml' }),
      normalized,
      resources,
      cwd: await tempDir(),
    })
    const tanstackPlan = await createGenerationPlan({
      config: resolveForgeConfig({
        input: './openapi.yaml',
        target: { query: 'tanstack-vue-query' },
        validation: 'zod',
      }),
      normalized,
      resources,
      cwd: await tempDir(),
    })

    expect(readFile(promisePlan, 'useUsersQuery.ts')).toContain('Promise<UsersListResponse>')
    expect(readFile(promisePlan, 'useUsersQuery.ts')).not.toContain('@tanstack/vue-query')
    expect(readFile(tanstackPlan, 'useUsersQuery.ts')).toContain("from '@tanstack/vue-query'")
    expect(readFile(tanstackPlan, 'useCreateUserMutation.ts')).toContain('useMutation')
    expect(readFile(tanstackPlan, 'users.validation.ts')).toContain("import { z } from 'zod'")
    expect(readFile(tanstackPlan, 'users.validation.ts')).toContain('export const createUserSchema')
    expect(readFile(tanstackPlan, 'index.ts')).toContain("export * from './users.validation'")
  })

  test('generated TanStack query and Zod validation artifacts typecheck in an isolated consumer', async () => {
    const normalized = normalizeOpenApi(crudSchema)
    const resources = detectResources(normalized.operations)
    const cwd = await tempDir()
    const plan = await createGenerationPlan({
      config: resolveForgeConfig({
        input: './openapi.yaml',
        target: { query: 'tanstack-vue-query' },
        validation: 'zod',
      }),
      normalized,
      resources,
      cwd,
    })

    await symlink(join(process.cwd(), 'node_modules'), join(cwd, 'node_modules'), 'dir')
    await writeGeneratedTypecheckFiles(cwd, plan)
    await writeFile(
      join(cwd, 'tsconfig.json'),
      JSON.stringify(
        {
          compilerOptions: {
            baseUrl: process.cwd(),
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            noEmit: true,
            paths: {
              '@archora/forge-runtime': ['packages/runtime/src/index.ts'],
              '@tanstack/vue-query': ['packages/core/node_modules/@tanstack/vue-query'],
              zod: ['packages/core/node_modules/zod'],
            },
            skipLibCheck: true,
            strict: true,
            target: 'ES2022',
          },
          include: ['src/**/*.ts'],
        },
        null,
        2,
      ),
      'utf8',
    )

    await expect(execFileAsync('pnpm', ['exec', 'tsc', '-p', join(cwd, 'tsconfig.json')], { cwd: process.cwd() })).resolves.toBeDefined()
  })

  test('archora-ui target emits package re-export adapter while fallback stays local', async () => {
    const normalized = normalizeOpenApi(crudSchema)
    const resources = detectResources(normalized.operations)
    const fallbackPlan = await createGenerationPlan({
      config: resolveForgeConfig({ input: './openapi.yaml' }),
      normalized,
      resources,
      cwd: await tempDir(),
    })
    const archoraUiPlan = await createGenerationPlan({
      config: resolveForgeConfig({ input: './openapi.yaml', target: { ui: 'archora-ui' } }),
      normalized,
      resources,
      cwd: await tempDir(),
    })

    expect(readFile(fallbackPlan, 'archora-ui.ts')).toContain("from 'vue'")
    expect(readFile(fallbackPlan, 'archora-ui.ts')).toContain('defineComponent')
    expect(readFile(archoraUiPlan, 'archora-ui.ts')).toContain("from '@archora/ui'")
    expect(readFile(archoraUiPlan, 'archora-ui.ts')).not.toContain('defineComponent')
  })

  test('contract diff reports breaking changes and affected generated files', () => {
    const nextSchema = {
      ...crudSchema,
      paths: {
        '/users': {
          get: crudSchema.paths['/users'].get,
          post: {
            ...crudSchema.paths['/users'].post,
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['email', 'status', 'role'],
                    properties: {
                      email: { type: 'string', format: 'email' },
                      status: { type: 'string', enum: ['active'] },
                      role: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }

    const diff = diffOpenApiContracts(normalizeOpenApi(crudSchema), normalizeOpenApi(nextSchema))

    expect(diff.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'removed-endpoint', severity: 'breaking', resource: 'users' }),
        expect.objectContaining({ code: 'required-field-added', severity: 'breaking', resource: 'users' }),
        expect.objectContaining({ code: 'enum-value-removed', severity: 'breaking', resource: 'users' }),
      ]),
    )
    expect(diff.affectedResources).toContain('users')
    expect(diff.affectedFiles).toContain('src/shared/api/generated/users/users.types.ts')
  })

  test('lint and plugin APIs expose experimental extension points', async () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Lint API', version: '1.0.0' },
      paths: {
        '/users': {
          get: {
            responses: { '200': { description: 'OK' } },
          },
        },
      },
    })
    const plugin: ForgePlugin = {
      name: 'beta-prep-test-plugin',
      version: '0.0.0',
      diagnostics: () => [
        {
          severity: 'warning',
          code: 'plugin-diagnostic',
          message: 'Plugin diagnostic',
          location: 'plugin',
          suggestion: 'Plugin suggestion',
        },
      ],
      generateArtifacts: () => [{ path: 'src/plugin-artifact.txt', content: 'plugin\n', kind: 'generated', overwrite: true }],
    }
    const lint = lintOpenApi(normalized, { strict: true })
    const diagnostics = collectDiagnostics(normalized, { plugins: [plugin] })
    const plan = await createGenerationPlan({
      config: { ...resolveForgeConfig({ input: './openapi.yaml' }), plugins: [plugin] },
      normalized,
      resources: detectResources(normalized.operations),
      cwd: await tempDir(),
    })

    expect(lint.ok).toBe(false)
    expect(lint.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(['missing-operation-id', 'missing-tags', 'missing-error-response']),
    )
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain('plugin-diagnostic')
    expect(plan.files.some((file) => file.path === 'src/plugin-artifact.txt')).toBe(true)
  })

  test('lint keeps preview demo score useful and avoids missing response-schema noise', async () => {
    const normalized = normalizeOpenApi(await parseOpenApi(join(process.cwd(), 'examples/vue-admin/openapi.yaml')))
    const report = lintOpenApi(normalized)
    const diagnosticKeys = report.diagnostics.map((diagnostic) => `${diagnostic.code}:${diagnostic.location ?? ''}`)

    expect(report.score).toBeGreaterThanOrEqual(70)
    expect(new Set(diagnosticKeys).size).toBe(diagnosticKeys.length)
    expect(report.diagnostics.filter((diagnostic) => diagnostic.code === 'missing-response-schema')).toHaveLength(0)
  })
})

function readFile(plan: Awaited<ReturnType<typeof createGenerationPlan>>, suffix: string): string {
  return plan.files.find((file) => file.path.endsWith(suffix))?.content ?? ''
}

async function tempDir(): Promise<string> {
  const dir = await mkdir(join(tmpdir(), `archora-forge-${crypto.randomUUID()}`), { recursive: true })
  if (!dir) {
    throw new Error('Failed to create temp dir')
  }

  return dir
}

async function writeGeneratedTypecheckFiles(cwd: string, plan: Awaited<ReturnType<typeof createGenerationPlan>>): Promise<void> {
  await Promise.all(
    plan.files
      .filter((file) => file.path.endsWith('.ts') && (file.path.includes('/shared/api/generated/') || file.path.includes('/features/')))
      .map(async (file) => {
        const path = join(cwd, file.path)
        await mkdir(dirname(path), { recursive: true })
        await writeFile(path, file.content, 'utf8')
      }),
  )
}
