import { mkdir, readFile as readTextFile, symlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { describe, expect, test } from 'vitest'

import { createCli, runCli } from '../packages/cli/src/index.js'
import { createForgeConfigPreset, resolveForgeConfig } from '../packages/config/src/index.js'
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
          tier: { type: 'integer', enum: [1, 2] },
          score: { type: 'number', minimum: 0, maximum: 100 },
          verified: { type: 'boolean', nullable: true },
        },
      },
      CreateUserDto: {
        type: 'object',
        required: ['email', 'status'],
        properties: {
          email: { type: 'string', format: 'email', minLength: 3, maxLength: 120 },
          kind: { type: 'string', const: 'user' },
          status: { type: 'string', enum: ['active', 'blocked'] },
          tier: { type: 'integer', enum: [1, 2] },
          score: { type: 'number', minimum: 0, maximum: 100 },
          externalKey: { anyOf: [{ type: 'string' }, { type: 'integer' }] },
          verified: { type: 'boolean', nullable: true },
          nickname: { type: ['string', 'null'] },
          externalId: { type: 'string', format: 'uuid' },
          website: { type: 'string', format: 'uri' },
          birthday: { type: 'string', format: 'date' },
          createdAt: { type: 'string', format: 'date-time' },
          labels: { type: 'object', additionalProperties: { type: 'string' } },
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

describe('Product regression coverage', () => {
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

  test('runtime client aborts requests when timeoutMs expires', async () => {
    let attempts = 0
    const fetchImpl: typeof fetch = async (_url, init) =>
      new Promise<Response>((resolve, reject) => {
        attempts += 1
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason ?? new DOMException('Request aborted', 'AbortError')), { once: true })
        setTimeout(() => resolve(new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } })), 30)
      })
    const client = createApiClient({
      baseUrl: 'https://api.test',
      timeoutMs: 1,
      retry: { attempts: 2 },
      fetchImpl,
    })

    await expect(client.request('GET', '/slow')).rejects.toThrow('Request timed out')
    expect(attempts).toBe(1)
  })

  test('runtime client treats empty JSON responses as undefined', async () => {
    const client = createApiClient({
      baseUrl: 'https://api.test',
      fetchImpl: async () => new Response('', { status: 200, headers: { 'content-type': 'application/json' } }),
    })

    await expect(client.request('GET', '/empty')).resolves.toBeUndefined()
  })

  test('runtime client sends URLSearchParams bodies without JSON stringifying them', async () => {
    const calls: Array<{ init: RequestInit }> = []
    const client = createApiClient({
      baseUrl: 'https://api.test',
      fetchImpl: async (_url, init) => {
        calls.push({ init: init ?? {} })
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } })
      },
    })
    const body = new URLSearchParams({ grant_type: 'client_credentials' })

    await client.request('POST', '/oauth/token', { body })

    expect(calls[0]?.init.body).toBe(body)
    expect(calls[0]?.init.headers).not.toMatchObject({ 'content-type': 'application/json' })
  })

  test('runtime client sends typed array bodies without JSON stringifying them', async () => {
    const calls: Array<{ init: RequestInit }> = []
    const client = createApiClient({
      baseUrl: 'https://api.test',
      fetchImpl: async (_url, init) => {
        calls.push({ init: init ?? {} })
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } })
      },
    })
    const body = new Uint8Array([1, 2, 3])

    await client.request('PUT', '/binary', { body })

    expect(calls[0]?.init.body).toBe(body)
    expect(calls[0]?.init.headers).not.toMatchObject({ 'content-type': 'application/json' })
  })

  test('runtime client sends ReadableStream bodies without JSON stringifying them', async () => {
    const calls: Array<{ init: RequestInit }> = []
    const client = createApiClient({
      baseUrl: 'https://api.test',
      fetchImpl: async (_url, init) => {
        calls.push({ init: init ?? {} })
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } })
      },
    })
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]))
        controller.close()
      },
    })

    await client.request('POST', '/stream', { body })

    expect(calls[0]?.init.body).toBe(body)
    expect(calls[0]?.init.headers).not.toMatchObject({ 'content-type': 'application/json' })
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

  test('CLI commands can pass one-off remote schema headers', async () => {
    const cwd = await tempDir()
    const calls: Array<{ url: string; init: RequestInit }> = []
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (url, init) => {
      calls.push({ url: String(url), init: init ?? {} })
      return new Response('openapi: 3.0.3\ninfo:\n  title: Header API\n  version: 1.0.0\npaths: {}\n', {
        status: 200,
        headers: { 'content-type': 'application/yaml' },
      })
    }) as typeof fetch

    try {
      const { exitCode, output } = await runCliInDirectory(cwd, [
        'inspect',
        'https://contracts.test/openapi.yaml',
        '--json',
        '--schema-header',
        'authorization: Bearer cli-secret',
        '--schema-header',
        'x-api-key=key-123',
      ])
      const payload = JSON.parse(output) as { ok: boolean; health: { endpointCount: number } }

      expect(exitCode).toBeUndefined()
      expect(payload.ok).toBe(true)
      expect(payload.health.endpointCount).toBe(0)
    } finally {
      globalThis.fetch = originalFetch
    }

    expect(calls[0]?.url).toBe('https://contracts.test/openapi.yaml')
    expect(calls[0]?.init.headers).toMatchObject({
      authorization: 'Bearer cli-secret',
      'x-api-key': 'key-123',
    })
  })

  test('remote OpenAPI loading reports timeout failures clearly', async () => {
    const fetchImpl: typeof fetch = async (_url, init) =>
      new Promise<Response>((resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason ?? new DOMException('Request aborted', 'AbortError')), { once: true })
        setTimeout(() => resolve(new Response('{}')), 30)
      })

    await expect(parseOpenApi('https://contracts.test/slow.yaml', { fetchImpl, timeoutMs: 1 })).rejects.toThrow('Request timed out after 1ms')
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
      expect.arrayContaining(['conflicting-allof', 'unsupported-oneof', 'unsupported-discriminator']),
    )
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unsupported-oneof',
          impact: expect.stringContaining('#/components/schemas/Polymorphic/oneOf/0'),
          suggestion: expect.stringContaining('Discriminator is present'),
        }),
      ]),
    )
    expect(diagnostics.map((diagnostic) => diagnostic.code)).not.toContain('supported-allof-object-merge')
  })

  test('zod validation mode generates opt-in artifacts without changing promise helpers', async () => {
    const normalized = normalizeOpenApi(crudSchema)
    const resources = detectResources(normalized.operations)
    const promisePlan = await createGenerationPlan({
      config: resolveForgeConfig({ input: './openapi.yaml' }),
      normalized,
      resources,
      cwd: await tempDir(),
    })
    const zodPlan = await createGenerationPlan({
      config: resolveForgeConfig({
        input: './openapi.yaml',
        validation: 'zod',
      }),
      normalized,
      resources,
      cwd: await tempDir(),
    })

    expect(readFile(promisePlan, 'useUsersQuery.ts')).toContain('Promise<UsersListResponse>')
    expect(readFile(promisePlan, 'useUsersQuery.ts')).not.toContain('@tanstack/vue-query')
    expect(readFile(zodPlan, 'useUsersQuery.ts')).toContain('Promise<UsersListResponse>')
    expect(readFile(zodPlan, 'users.validation.ts')).toContain("import { z } from 'zod'")
    expect(readFile(zodPlan, 'users.validation.ts')).toContain('export const createUserSchema')
    expect(readFile(zodPlan, 'users.validation.ts')).toContain("kind: z.literal('user').optional()")
    expect(readFile(zodPlan, 'users.validation.ts')).toContain('externalId: z.string().uuid().optional()')
    expect(readFile(zodPlan, 'users.validation.ts')).toContain('tier: z.union([z.literal(1), z.literal(2)]).optional()')
    expect(readFile(zodPlan, 'users.validation.ts')).toContain('externalKey: z.union([z.string(), z.number().int()]).optional()')
    expect(readFile(zodPlan, 'users.validation.ts')).toContain('website: z.string().url().optional()')
    expect(readFile(zodPlan, 'users.validation.ts')).toContain('birthday: z.string().date().optional()')
    expect(readFile(zodPlan, 'users.validation.ts')).toContain('createdAt: z.string().datetime().optional()')
    expect(readFile(zodPlan, 'users.validation.ts')).toContain('nickname: z.string().nullable().optional()')
    expect(readFile(zodPlan, 'users.validation.ts')).toContain('labels: z.record(z.string(), z.string()).optional()')
    expect(readFile(zodPlan, 'index.ts')).toContain("export * from './users.validation'")
  })

  test('valibot validation mode generates opt-in artifacts without adapter placeholders', async () => {
    const normalized = normalizeOpenApi(crudSchema)
    const resources = detectResources(normalized.operations)
    const valibotPlan = await createGenerationPlan({
      config: resolveForgeConfig({
        input: './openapi.yaml',
        validation: 'valibot',
      }),
      normalized,
      resources,
      cwd: await tempDir(),
    })

    const validation = readFile(valibotPlan, 'users.validation.ts')
    expect(validation).toContain("import * as v from 'valibot'")
    expect(validation).toContain('export const createUserSchema')
    expect(validation).toContain("kind: v.optional(v.literal('user'))")
    expect(validation).toContain("v.pipe(v.string(), v.email(), v.minLength(3), v.maxLength(120))")
    expect(validation).toContain('externalId: v.optional(v.pipe(v.string(), v.uuid()))')
    expect(validation).toContain('tier: v.optional(v.picklist([1, 2]))')
    expect(validation).toContain('externalKey: v.optional(v.union([v.string(), v.pipe(v.number(), v.integer())]))')
    expect(validation).toContain('website: v.optional(v.pipe(v.string(), v.url()))')
    expect(validation).toContain('birthday: v.optional(v.pipe(v.string(), v.isoDate()))')
    expect(validation).toContain('createdAt: v.optional(v.pipe(v.string(), v.isoDateTime()))')
    expect(validation).toContain('nickname: v.optional(v.nullable(v.string()))')
    expect(validation).toContain('labels: v.optional(v.record(v.string(), v.string()))')
    expect(validation).toContain("v.picklist(['active', 'blocked'])")
    expect(validation).toContain('v.optional(v.nullable(v.boolean()))')
    expect(validation).not.toContain('supported: false')
    expect(readFile(valibotPlan, 'index.ts')).toContain("export * from './users.validation'")
  })

  test('zod validation mode does not recurse forever on self-referencing schemas', async () => {
    const schema = {
      ...crudSchema,
      paths: {
        '/passports': {
          post: {
            operationId: 'createPassport',
            tags: ['Passports'],
            requestBody: {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Passport' },
                },
              },
            },
            responses: {
              '201': {
                description: 'Created',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Passport' } } },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Passport: {
            type: 'object',
            properties: {
              series: { type: 'string' },
              issuedPassportInfo: { $ref: '#/components/schemas/Passport' },
            },
          },
        },
      },
    }
    const normalized = normalizeOpenApi(schema)
    const resources = detectResources(normalized.operations)
    const zodPlan = await createGenerationPlan({
      config: resolveForgeConfig({
        input: './openapi.yaml',
        validation: 'zod',
      }),
      normalized,
      resources,
      cwd: await tempDir(),
    })

    const validation = readFile(zodPlan, 'passports.validation.ts')
    expect(validation).toContain('issuedPassportInfo')
    expect(validation).toContain('z.lazy(() => z.unknown())')
  })

  test('valibot validation mode does not recurse forever on self-referencing schemas', async () => {
    const schema = {
      ...crudSchema,
      paths: {
        '/passports': {
          post: {
            operationId: 'createPassport',
            tags: ['Passports'],
            requestBody: {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Passport' },
                },
              },
            },
            responses: {
              '201': {
                description: 'Created',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Passport' } } },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Passport: {
            type: 'object',
            properties: {
              series: { type: 'string' },
              issuedPassportInfo: { $ref: '#/components/schemas/Passport' },
            },
          },
        },
      },
    }
    const normalized = normalizeOpenApi(schema)
    const resources = detectResources(normalized.operations)
    const valibotPlan = await createGenerationPlan({
      config: resolveForgeConfig({
        input: './openapi.yaml',
        validation: 'valibot',
      }),
      normalized,
      resources,
      cwd: await tempDir(),
    })

    const validation = readFile(valibotPlan, 'passports.validation.ts')
    expect(validation).toContain('issuedPassportInfo')
    expect(validation).toContain('v.lazy(() => v.unknown())')
  })

  test('vitest resolves workspace packages to source entrypoints in fresh clones', async () => {
    const vitestConfig = await readTextFile(join(process.cwd(), 'vitest.config.ts'), 'utf8')

    expect(vitestConfig).toContain("'@archora/forge-core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url))")
    expect(vitestConfig).toContain("'@archora/forge-adapters': fileURLToPath(new URL('./packages/adapters/src/index.ts', import.meta.url))")
  })

  test('check command can write a markdown report file for CI artifacts', async () => {
    const cwd = await tempDir()
    const schemaPath = join(cwd, 'openapi.yaml')
    const reportPath = join(cwd, 'forge-check.md')
    await writeFile(schemaPath, 'openapi: 3.0.3\ninfo:\n  title: Report API\n  version: 1.0.0\npaths: {}\n', 'utf8')

    const previousExitCode = process.exitCode
    const previousCwd = process.cwd()
    const lines: string[] = []
    const originalLog = console.log
    process.exitCode = undefined
    console.log = (...args: unknown[]) => {
      lines.push(args.map(String).join(' '))
    }
    let exitCode: string | number | undefined
    try {
      process.chdir(cwd)
      const cli = createCli()
      cli.parse(['node', 'archora-forge', 'check', schemaPath, '--report', 'markdown', '--report-file', reportPath], {
        run: false,
      })
      await cli.runMatchedCommand()
      exitCode = process.exitCode
    } finally {
      process.chdir(previousCwd)
      console.log = originalLog
      process.exitCode = previousExitCode
    }

    const report = await readTextFile(reportPath, 'utf8')
    expect(report).toContain('# Archora Forge Check')
    expect(report).toContain('Status: failed')
    expect(report).toContain('## Pilot Readiness')
    expect(report).toContain('## Schema Coverage Matrix')
    expect(report).toContain('Readiness: blocked')
    expect(report).toContain('Generated output drift is present.')
    expect(report).toContain('components.types.ts')
    expect(lines.join('\n')).toContain(`Report written: ${reportPath}`)
    expect(exitCode).toBe(1)
  })

  test('check command can write a JSON report file for CI artifacts', async () => {
    const cwd = await tempDir()
    const schemaPath = join(cwd, 'openapi.yaml')
    const reportPath = join(cwd, 'forge-check.json')
    await writeFile(schemaPath, 'openapi: 3.0.3\ninfo:\n  title: JSON Report API\n  version: 1.0.0\npaths: {}\n', 'utf8')

    const previousExitCode = process.exitCode
    const previousCwd = process.cwd()
    const lines: string[] = []
    const originalLog = console.log
    process.exitCode = undefined
    console.log = (...args: unknown[]) => {
      lines.push(args.map(String).join(' '))
    }
    let exitCode: string | number | undefined
    try {
      process.chdir(cwd)
      const cli = createCli()
      cli.parse(['node', 'archora-forge', 'check', schemaPath, '--report', 'json', '--report-file', reportPath], {
        run: false,
      })
      await cli.runMatchedCommand()
      exitCode = process.exitCode
    } finally {
      process.chdir(previousCwd)
      console.log = originalLog
      process.exitCode = previousExitCode
    }

    const payload = JSON.parse(await readTextFile(reportPath, 'utf8')) as {
      ok: boolean
      schema: string
      schemas: Array<{ configPath: string | null }>
      drift: unknown[]
      readiness: {
        status: string
        decision: string
        blockers: string[]
        warnings: string[]
        nextActions: string[]
        summary: { healthScore: number; resources: number; generatedFiles: number; protectedFiles: number; diagnostics: number; drift: number; failedChecks: number }
      }
    }
    expect(payload.ok).toBe(false)
    expect(payload.schema).toBe(schemaPath)
    expect(payload.schemas[0]?.configPath).toBeNull()
    expect(payload.drift.length).toBeGreaterThan(0)
    expect(payload.readiness.status).toBe('blocked')
    expect(payload.readiness.decision).toContain('not ready')
    expect(payload.readiness.blockers).toContain('Generated output drift is present.')
    expect(payload.readiness.nextActions).toContain('Run `archora-forge generate` and commit the generated output, or review intentional drift before the pilot handoff.')
    expect(payload.readiness.summary.drift).toBe(payload.drift.length)
    expect(lines.join('\n')).toContain(`Report written: ${reportPath}`)
    expect(exitCode).toBe(1)
  })

  test('check command reports generated file metadata alignment as JSON', async () => {
    const cwd = await tempDir()
    await writeFile(join(cwd, 'openapi.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Generator Metadata API\n  version: 1.0.0\npaths: {}\n', 'utf8')
    await runCliInDirectory(cwd, ['generate', './openapi.yaml', '--json'])

    const generatedPath = join(cwd, 'src/shared/api/generated/components.types.ts')
    await writeFile(
      generatedPath,
      '// @archora-forge-generated\n// @archora-forge-meta {"version":"0.9.0","schemaHash":"oldschema000","configHash":"oldconfig000"}\nexport type Components = Record<string, never>\n',
      'utf8',
    )

    const { exitCode, output } = await runCliInDirectory(cwd, ['check', './openapi.yaml', '--json'])
    const payload = JSON.parse(output) as {
      generator: {
        status: string
        version: string
        files: {
          total: number
          missingMetadata: Array<{ path: string }>
          versionMismatches: Array<{ path: string; expected: string; actual: string }>
          schemaHashMismatches: Array<{ path: string; expected: string; actual: string }>
          configHashMismatches: Array<{ path: string; expected: string; actual: string }>
        }
      }
    }

    expect(payload.generator.status).toBe('mismatch')
    expect(payload.generator.version).toBe('1.0.0')
    expect(payload.generator.files.total).toBeGreaterThan(0)
    expect(payload.generator.files.missingMetadata).toEqual([])
    expect(payload.generator.files.versionMismatches).toEqual([
      { path: 'src/shared/api/generated/components.types.ts', expected: '1.0.0', actual: '0.9.0' },
    ])
    expect(payload.generator.files.schemaHashMismatches[0]).toMatchObject({
      path: 'src/shared/api/generated/components.types.ts',
      actual: 'oldschema000',
    })
    expect(payload.generator.files.configHashMismatches[0]).toMatchObject({
      path: 'src/shared/api/generated/components.types.ts',
      actual: 'oldconfig000',
    })
    expect(exitCode).toBe(1)
  })

  test('check command can write an HTML report file for release artifacts', async () => {
    const cwd = await tempDir()
    const schemaPath = join(cwd, 'openapi.yaml')
    const reportPath = join(cwd, 'forge-check.html')
    await writeFile(schemaPath, 'openapi: 3.0.3\ninfo:\n  title: HTML Check API\n  version: 1.0.0\npaths: {}\n', 'utf8')

    const previousExitCode = process.exitCode
    const previousCwd = process.cwd()
    const lines: string[] = []
    const originalLog = console.log
    process.exitCode = undefined
    console.log = (...args: unknown[]) => {
      lines.push(args.map(String).join(' '))
    }
    let exitCode: string | number | undefined
    try {
      process.chdir(cwd)
      const cli = createCli()
      cli.parse(['node', 'archora-forge', 'check', schemaPath, '--report', 'html', '--report-file', reportPath], {
        run: false,
      })
      await cli.runMatchedCommand()
      exitCode = process.exitCode
    } finally {
      process.chdir(previousCwd)
      console.log = originalLog
      process.exitCode = previousExitCode
    }

    const report = await readTextFile(reportPath, 'utf8')
    expect(report).toContain('<!doctype html>')
    expect(report).toContain('Archora Forge Check')
    expect(report).toContain('Pilot Readiness')
    expect(report).toContain('Schema Coverage Matrix')
    expect(report).toContain('Generated output drift is present.')
    expect(report).toContain('components.types.ts')
    expect(report).toContain('Failed Checks')
    expect(lines.join('\n')).toContain(`Report written: ${reportPath}`)
    expect(exitCode).toBe(1)
  })

  test('init command creates a configurable zero-dependency starter config', async () => {
    const cwd = await tempDir()
    const previousCwd = process.cwd()
    const lines: string[] = []
    const originalLog = console.log
    console.log = (...args: unknown[]) => {
      lines.push(args.map(String).join(' '))
    }
    try {
      process.chdir(cwd)
      const cli = createCli()
      cli.parse(
        [
          'node',
          'archora-forge',
          'init',
          '--input',
          './contracts/openapi.yaml',
          '--validation',
          'valibot',
          '--output',
          './app/generated',
          '--features',
          './app/features',
          '--mocks',
          './app/mocks',
        ],
        { run: false },
      )
      await cli.runMatchedCommand()
    } finally {
      process.chdir(previousCwd)
      console.log = originalLog
    }

    const config = await readTextFile(join(cwd, 'archora-forge.config.ts'), 'utf8')
    expect(config).toContain("from '@archora/forge-cli'")
    expect(config).toContain("input: './contracts/openapi.yaml'")
    expect(config).toContain("generatedDir: './app/generated'")
    expect(config).toContain("featuresDir: './app/features'")
    expect(config).toContain("mocksDir: './app/mocks'")
    expect(config).toContain("validation: 'valibot'")
    expect(lines.join('\n')).toContain('Next: archora-forge inspect')
  })

  test('runCli reports command errors without throwing stack traces', async () => {
    const previousExitCode = process.exitCode
    const errors: string[] = []
    const originalError = console.error
    let actualExitCode: string | number | undefined
    process.exitCode = undefined
    console.error = (...values: unknown[]) => {
      errors.push(values.map(String).join(' '))
    }
    try {
      await runCli(['node', 'archora-forge', 'init', '--validation', 'invalid'])
      actualExitCode = process.exitCode
    } finally {
      console.error = originalError
      process.exitCode = previousExitCode
    }

    expect(errors.join('\n')).toContain('Invalid validation mode')
    expect(errors.join('\n')).not.toContain('at ')
    expect(actualExitCode).toBe(2)
  })

  test('runCli reports JSON command errors as machine-readable payloads', async () => {
    const previousExitCode = process.exitCode
    const lines: string[] = []
    const errors: string[] = []
    const originalLog = console.log
    const originalError = console.error
    let actualExitCode: string | number | undefined
    process.exitCode = undefined
    console.log = (...values: unknown[]) => {
      lines.push(values.map(String).join(' '))
    }
    console.error = (...values: unknown[]) => {
      errors.push(values.map(String).join(' '))
    }
    try {
      await runCli(['node', 'archora-forge', 'validate', './missing-openapi.yaml', '--json'])
      actualExitCode = process.exitCode
    } finally {
      console.log = originalLog
      console.error = originalError
      process.exitCode = previousExitCode
    }

    const payload = JSON.parse(lines.join('\n')) as { ok: boolean; error: string }
    expect(payload.ok).toBe(false)
    expect(payload.error).toContain('Failed to read OpenAPI schema')
    expect(errors.join('\n')).toBe('')
    expect(actualExitCode).toBe(2)
  })

  test('validate can write a JSON report file for CI artifacts', async () => {
    const cwd = await tempDir()
    const reportPath = join(cwd, 'forge-validate.json')
    await writeFile(join(cwd, 'openapi.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Validate Report API\n  version: 1.0.0\npaths: {}\n', 'utf8')

    const { exitCode, output } = await runCliInDirectory(cwd, ['validate', './openapi.yaml', '--json', '--report-file', reportPath])
    const payload = JSON.parse(await readTextFile(reportPath, 'utf8')) as { ok: boolean; schema: string; configPath: string | null; diagnostics: unknown[] }

    expect(payload.ok).toBe(true)
    expect(payload.schema).toContain('openapi.yaml')
    expect(payload.configPath).toBeNull()
    expect(payload.diagnostics).toEqual([])
    expect(output).toContain(`Report written: ${reportPath}`)
    expect(exitCode).toBeUndefined()
  })

  test('lint can write a JSON report file for CI artifacts', async () => {
    const cwd = await tempDir()
    const reportPath = join(cwd, 'forge-lint.json')
    await writeFile(join(cwd, 'openapi.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Lint Report API\n  version: 1.0.0\npaths: {}\n', 'utf8')

    const { exitCode, output } = await runCliInDirectory(cwd, ['lint', './openapi.yaml', '--json', '--report-file', reportPath])
    const payload = JSON.parse(await readTextFile(reportPath, 'utf8')) as { ok: boolean; schema: string; configPath: string | null; score: number; diagnostics: unknown[] }

    expect(payload.ok).toBe(true)
    expect(payload.schema).toContain('openapi.yaml')
    expect(payload.configPath).toBeNull()
    expect(payload.score).toBeGreaterThan(0)
    expect(payload.diagnostics).toEqual([])
    expect(output).toContain(`Report written: ${reportPath}`)
    expect(exitCode).toBe(0)
  })

  test('validate can aggregate configured multi-schema inputs', async () => {
    const cwd = await tempDir()
    await mkdir(join(cwd, 'contracts'), { recursive: true })
    await writeFile(join(cwd, 'contracts/users.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Users API\n  version: 1.0.0\npaths: {}\n', 'utf8')
    await writeFile(join(cwd, 'contracts/billing.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Billing API\n  version: 1.0.0\npaths: {}\n', 'utf8')
    await writeFile(
      join(cwd, 'archora-forge.config.ts'),
      [
        "import { defineForgeConfig } from '@archora/forge-cli'",
        '',
        'export default defineForgeConfig({',
        '  inputs: [',
        "    { name: 'users', path: './contracts/users.yaml' },",
        "    { name: 'billing', path: './contracts/billing.yaml' },",
        '  ],',
        '})',
        '',
      ].join('\n'),
      'utf8',
    )

    const { exitCode, output } = await runCliInDirectory(cwd, ['validate', '--json'])
    const payload = JSON.parse(output) as { ok: boolean; schemas: Array<{ name: string; schema: string; diagnosticsCount: number }>; diagnostics: unknown[] }

    expect(payload.ok).toBe(true)
    expect(payload.schemas.map((schema) => schema.name)).toEqual(['users', 'billing'])
    expect(payload.schemas.map((schema) => schema.schema)).toEqual([join(cwd, 'contracts/users.yaml'), join(cwd, 'contracts/billing.yaml')])
    expect(payload.schemas.map((schema) => schema.diagnosticsCount)).toEqual([0, 0])
    expect(payload.diagnostics).toEqual([])
    expect(exitCode).toBeUndefined()
  })

  test('validate can write an HTML report file for release artifacts', async () => {
    const cwd = await tempDir()
    const reportPath = join(cwd, 'forge-validate.html')
    await writeFile(
      join(cwd, 'openapi.yaml'),
      'openapi: 3.0.3\ninfo:\n  title: Validate HTML API\n  version: 1.0.0\npaths:\n  /reports:\n    get:\n      operationId: listReports\n      responses:\n        "200": { description: Missing content }\n',
      'utf8',
    )

    const { exitCode, output } = await runCliInDirectory(cwd, ['validate', './openapi.yaml', '--report', 'html', '--report-file', reportPath])
    const report = await readTextFile(reportPath, 'utf8')

    expect(report).toContain('<!doctype html>')
    expect(report).toContain('Archora Forge Validate')
    expect(report).toContain('No diagnostics.')
    expect(report).toContain('Diagnostics')
    expect(output).toContain(`Report written: ${reportPath}`)
    expect(exitCode).toBeUndefined()
  })

  test('lint can aggregate configured multi-schema inputs', async () => {
    const cwd = await tempDir()
    await mkdir(join(cwd, 'contracts'), { recursive: true })
    await writeFile(join(cwd, 'contracts/users.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Users API\n  version: 1.0.0\npaths: {}\n', 'utf8')
    await writeFile(join(cwd, 'contracts/billing.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Billing API\n  version: 1.0.0\npaths: {}\n', 'utf8')
    await writeFile(
      join(cwd, 'archora-forge.config.ts'),
      [
        "import { defineForgeConfig } from '@archora/forge-cli'",
        '',
        'export default defineForgeConfig({',
        '  inputs: [',
        "    { name: 'users', path: './contracts/users.yaml' },",
        "    { name: 'billing', path: './contracts/billing.yaml' },",
        '  ],',
        '})',
        '',
      ].join('\n'),
      'utf8',
    )

    const { exitCode, output } = await runCliInDirectory(cwd, ['lint', '--json'])
    const payload = JSON.parse(output) as { ok: boolean; schemas: Array<{ name: string; score: number; diagnosticsCount: number }>; diagnostics: unknown[] }

    expect(payload.ok).toBe(true)
    expect(payload.schemas.map((schema) => schema.name)).toEqual(['users', 'billing'])
    expect(payload.schemas.every((schema) => schema.score > 0)).toBe(true)
    expect(payload.schemas.map((schema) => schema.diagnosticsCount)).toEqual([0, 0])
    expect(payload.diagnostics).toEqual([])
    expect(exitCode).toBe(0)
  })

  test('generate command can use schema from discovered config', async () => {
    const cwd = await tempDir()
    await writeFile(join(cwd, 'openapi.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Config API\n  version: 1.0.0\npaths: {}\n', 'utf8')
    await writeFile(
      join(cwd, 'archora-forge.config.ts'),
      "import { defineForgeConfig } from '@archora/forge-cli'\n\nexport default defineForgeConfig({ input: './openapi.yaml' })\n",
      'utf8',
    )

    const previousCwd = process.cwd()
    const lines: string[] = []
    const originalLog = console.log
    console.log = (...args: unknown[]) => {
      lines.push(args.map(String).join(' '))
    }
    try {
      process.chdir(cwd)
      const cli = createCli()
      cli.parse(['node', 'archora-forge', 'generate', '--dry-run'], { run: false })
      await cli.runMatchedCommand()
    } finally {
      process.chdir(previousCwd)
      console.log = originalLog
    }

    expect(lines.join('\n')).toContain('Dry run complete')
  })

  test('inspect json includes resource operation details for automation', async () => {
    const schemaPath = join(process.cwd(), 'test/fixtures/openapi/basic-crud.yaml')
    const { exitCode, output } = await runCliInDirectory(process.cwd(), ['inspect', schemaPath, '--json'])
    const payload = JSON.parse(output) as {
      ok: boolean
      resourceCount: number
      resources: Array<{
        name: string
        entity: string
        kind: string
        operations: Record<string, string>
        missing: string[]
      }>
    }

    expect(payload.ok).toBe(true)
    expect(payload.resourceCount).toBe(1)
    expect(payload.resources[0]).toMatchObject({
      name: 'users',
      entity: 'User',
      kind: 'crud-resource',
      operations: {
        list: 'listUsers',
        detail: 'getUser',
        create: 'createUser',
        update: 'updateUser',
        delete: 'deleteUser',
      },
      missing: [],
    })
    expect(exitCode).toBeUndefined()
  })

  test('inspect can aggregate configured multi-schema inputs', async () => {
    const cwd = await tempDir()
    await mkdir(join(cwd, 'contracts'), { recursive: true })
    await writeFile(join(cwd, 'contracts/users.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Users API\n  version: 1.0.0\npaths: {}\n', 'utf8')
    await writeFile(join(cwd, 'contracts/billing.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Billing API\n  version: 1.0.0\npaths: {}\n', 'utf8')
    await writeFile(
      join(cwd, 'archora-forge.config.ts'),
      [
        "import { defineForgeConfig } from '@archora/forge-cli'",
        '',
        'export default defineForgeConfig({',
        '  inputs: [',
        "    { name: 'users', path: './contracts/users.yaml' },",
        "    { name: 'billing', path: './contracts/billing.yaml' },",
        '  ],',
        '})',
        '',
      ].join('\n'),
      'utf8',
    )

    const { exitCode, output } = await runCliInDirectory(cwd, ['inspect', '--json'])
    const payload = JSON.parse(output) as {
      ok: boolean
      schemas: Array<{ name: string; schema: string; resourceCount: number }>
      resourceCount: number
      diagnostics: unknown[]
    }

    expect(payload.ok).toBe(true)
    expect(payload.schemas.map((schema) => schema.name)).toEqual(['users', 'billing'])
    expect(payload.schemas.map((schema) => schema.schema)).toEqual([join(cwd, 'contracts/users.yaml'), join(cwd, 'contracts/billing.yaml')])
    expect(payload.schemas.map((schema) => schema.resourceCount)).toEqual([0, 0])
    expect(payload.resourceCount).toBe(0)
    expect(payload.diagnostics).toEqual([])
    expect(exitCode).toBeUndefined()
  })

  test('inspect can write a JSON report file for CI artifacts', async () => {
    const cwd = await tempDir()
    const reportPath = join(cwd, 'forge-inspect.json')
    await writeFile(join(cwd, 'openapi.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Inspect Report API\n  version: 1.0.0\npaths: {}\n', 'utf8')

    const { exitCode, output } = await runCliInDirectory(cwd, ['inspect', './openapi.yaml', '--json', '--report-file', reportPath])
    const payload = JSON.parse(await readTextFile(reportPath, 'utf8')) as { ok: boolean; schema: string; configPath: string | null; resourceCount: number }

    expect(payload.ok).toBe(true)
    expect(payload.schema).toContain('openapi.yaml')
    expect(payload.configPath).toBeNull()
    expect(payload.resourceCount).toBe(0)
    expect(output).toContain(`Report written: ${reportPath}`)
    expect(exitCode).toBeUndefined()
  })

  test('inspect can write an HTML report file for schema review', async () => {
    const cwd = await tempDir()
    const reportPath = join(cwd, 'forge-inspect.html')
    await writeFile(
      join(cwd, 'openapi.yaml'),
      'openapi: 3.0.3\ninfo:\n  title: Inspect HTML API\n  version: 1.0.0\npaths:\n  /users:\n    get:\n      operationId: listUsers\n      tags: [Users]\n      responses:\n        "200":\n          description: Users\n          content:\n            application/json:\n              schema:\n                type: array\n                items: { type: object, properties: { id: { type: string } } }\n',
      'utf8',
    )

    const { exitCode, output } = await runCliInDirectory(cwd, ['inspect', './openapi.yaml', '--report', 'html', '--report-file', reportPath])
    const report = await readTextFile(reportPath, 'utf8')

    expect(report).toContain('<!doctype html>')
    expect(report).toContain('Archora Forge Inspect')
    expect(report).toContain('Schemas')
    expect(report).toContain('Diagnostics')
    expect(output).toContain(`Report written: ${reportPath}`)
    expect(exitCode).toBeUndefined()
  })

  test('doctor command reports config, schema and output readiness as JSON', async () => {
    const cwd = await tempDir()
    await writeFile(join(cwd, 'openapi.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Doctor API\n  version: 1.0.0\npaths: {}\n', 'utf8')
    await writeFile(
      join(cwd, 'archora-forge.config.ts'),
      "import { defineForgeConfig } from '@archora/forge-cli'\n\nexport default defineForgeConfig({ input: './openapi.yaml', output: { generatedDir: './app/generated' } })\n",
      'utf8',
    )

    const { exitCode, output } = await runCliInDirectory(cwd, ['doctor', '--json'])
    const payload = JSON.parse(output) as {
      ok: boolean
      schema: string
      configPath: string
      output: { generatedDir: string }
      resourceCount: number
      diagnosticsCount: number
    }

    expect(payload.ok).toBe(true)
    expect(payload.schema).toBe(join(cwd, 'openapi.yaml'))
    expect(payload.configPath).toBe(join(cwd, 'archora-forge.config.ts'))
    expect(payload.output.generatedDir).toBe('./app/generated')
    expect(payload.resourceCount).toBe(0)
    expect(payload.diagnosticsCount).toBe(0)
    expect(exitCode).toBe(0)
  })

  test('doctor command summarizes configured multi-schema inputs as JSON', async () => {
    const cwd = await tempDir()
    await mkdir(join(cwd, 'contracts'), { recursive: true })
    await writeFile(join(cwd, 'contracts/users.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Users API\n  version: 1.0.0\npaths: {}\n', 'utf8')
    await writeFile(join(cwd, 'contracts/billing.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Billing API\n  version: 1.0.0\npaths: {}\n', 'utf8')
    await writeFile(
      join(cwd, 'archora-forge.config.ts'),
      [
        "import { defineForgeConfig } from '@archora/forge-cli'",
        '',
        'export default defineForgeConfig({',
        "  inputs: [",
        "    { name: 'users', path: './contracts/users.yaml' },",
        "    { name: 'billing', path: './contracts/billing.yaml' },",
        '  ],',
        '})',
      ].join('\n'),
      'utf8',
    )

    const { exitCode, output } = await runCliInDirectory(cwd, ['doctor', '--json'])
    const payload = JSON.parse(output) as {
      ok: boolean
      schemas: Array<{ name: string; schema: string; resourceCount: number; diagnosticsCount: number }>
      resourceCount: number
      diagnosticsCount: number
    }

    expect(payload.ok).toBe(true)
    expect(payload.schemas.map((schema) => schema.name)).toEqual(['users', 'billing'])
    expect(payload.schemas.map((schema) => schema.schema)).toEqual([join(cwd, 'contracts/users.yaml'), join(cwd, 'contracts/billing.yaml')])
    expect(payload.resourceCount).toBe(0)
    expect(payload.diagnosticsCount).toBe(0)
    expect(exitCode).toBe(0)
  })

  test('doctor command can write a JSON readiness report file', async () => {
    const cwd = await tempDir()
    const reportPath = join(cwd, 'forge-doctor.json')
    await writeFile(join(cwd, 'openapi.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Doctor Report API\n  version: 1.0.0\npaths: {}\n', 'utf8')

    const { exitCode, output } = await runCliInDirectory(cwd, ['doctor', './openapi.yaml', '--json', '--report-file', reportPath])
    const payload = JSON.parse(await readTextFile(reportPath, 'utf8')) as { ok: boolean; schema: string; diagnosticsCount: number }

    expect(payload.ok).toBe(true)
    expect(payload.schema).toBe(join(cwd, 'openapi.yaml'))
    expect(payload.diagnosticsCount).toBe(0)
    expect(output).toContain(`Report written: ${reportPath}`)
    expect(exitCode).toBe(0)
  })

  test('diff command can print machine-readable file plan JSON', async () => {
    const cwd = await tempDir()
    await writeFile(join(cwd, 'openapi.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Diff JSON API\n  version: 1.0.0\npaths: {}\n', 'utf8')

    const { exitCode, output } = await runCliInDirectory(cwd, ['diff', './openapi.yaml', '--json'])
    const payload = JSON.parse(output) as {
      ok: boolean
      schema: string
      resources: number
      files: { create: number; update: number; protected: number }
    }

    expect(payload.ok).toBe(true)
    expect(payload.schema).toBe(join(cwd, 'openapi.yaml'))
    expect(payload.resources).toBe(0)
    expect(payload.files.create).toBeGreaterThan(0)
    expect(payload.files.update).toBe(0)
    expect(payload.files.protected).toBe(0)
    expect(exitCode).toBeUndefined()
  })

  test('diff command can write a JSON file-plan report', async () => {
    const cwd = await tempDir()
    const reportPath = join(cwd, 'forge-diff.json')
    await writeFile(join(cwd, 'openapi.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Diff Report API\n  version: 1.0.0\npaths: {}\n', 'utf8')

    const { exitCode, output } = await runCliInDirectory(cwd, ['diff', './openapi.yaml', '--json', '--report-file', reportPath])
    const payload = JSON.parse(await readTextFile(reportPath, 'utf8')) as { ok: boolean; files: { create: number } }

    expect(payload.ok).toBe(true)
    expect(payload.files.create).toBeGreaterThan(0)
    expect(output).toContain(`Report written: ${reportPath}`)
    expect(exitCode).toBeUndefined()
  })

  test('diff command can aggregate configured multi-schema inputs', async () => {
    const cwd = await tempDir()
    await mkdir(join(cwd, 'contracts'), { recursive: true })
    await writeFile(join(cwd, 'contracts/users.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Users API\n  version: 1.0.0\npaths: {}\n', 'utf8')
    await writeFile(join(cwd, 'contracts/billing.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Billing API\n  version: 1.0.0\npaths: {}\n', 'utf8')
    await writeFile(
      join(cwd, 'archora-forge.config.ts'),
      [
        "import { defineForgeConfig } from '@archora/forge-cli'",
        '',
        'export default defineForgeConfig({',
        '  inputs: [',
        "    { name: 'users', path: './contracts/users.yaml', output: { generatedDir: './src/users/generated' } },",
        "    { name: 'billing', path: './contracts/billing.yaml', output: { generatedDir: './src/billing/generated' } },",
        '  ],',
        '})',
        '',
      ].join('\n'),
      'utf8',
    )

    const { exitCode, output } = await runCliInDirectory(cwd, ['diff', '--json'])
    const payload = JSON.parse(output) as {
      ok: boolean
      schemas: Array<{ name: string; schema: string; files: { create: number } }>
      files: { create: number; update: number; protected: number }
    }

    expect(payload.ok).toBe(true)
    expect(payload.schemas.map((schema) => schema.name)).toEqual(['users', 'billing'])
    expect(payload.schemas.map((schema) => schema.schema)).toEqual([join(cwd, 'contracts/users.yaml'), join(cwd, 'contracts/billing.yaml')])
    expect(payload.schemas.map((schema) => schema.files.create)).toEqual([1, 1])
    expect(payload.files.create).toBe(2)
    expect(payload.files.update).toBe(0)
    expect(payload.files.protected).toBe(0)
    expect(exitCode).toBeUndefined()
  })

  test('generate dry-run can print machine-readable write summary JSON', async () => {
    const cwd = await tempDir()
    await writeFile(join(cwd, 'openapi.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Generate JSON API\n  version: 1.0.0\npaths: {}\n', 'utf8')

    const { exitCode, output } = await runCliInDirectory(cwd, ['generate', './openapi.yaml', '--dry-run', '--json'])
    const payload = JSON.parse(output) as {
      ok: boolean
      schema: string
      dryRun: boolean
      resources: number
      diagnostics: unknown[]
      files: {
        planned: { create: number; update: number; protected: number }
        result: { created: number; updated: number; protected: number }
      }
    }

    expect(payload.ok).toBe(true)
    expect(payload.schema).toBe(join(cwd, 'openapi.yaml'))
    expect(payload.dryRun).toBe(true)
    expect(payload.resources).toBe(0)
    expect(payload.diagnostics).toEqual([])
    expect(payload.files.planned.create).toBeGreaterThan(0)
    expect(payload.files.result.created).toBe(payload.files.planned.create)
    expect(exitCode).toBeUndefined()
  })

  test('generate dry-run prune reports stale marker-owned files without deleting them', async () => {
    const cwd = await tempDir()
    await mkdir(join(cwd, 'src/shared/api/generated/legacy'), { recursive: true })
    await writeFile(join(cwd, 'openapi.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Prune Preview API\n  version: 1.0.0\npaths: {}\n', 'utf8')
    await writeFile(join(cwd, 'src/shared/api/generated/legacy/legacy.client.ts'), '// @archora-forge-generated\nexport const legacy = true\n', 'utf8')
    await writeFile(join(cwd, 'src/shared/api/generated/legacy/local-helper.ts'), 'export const local = true\n', 'utf8')

    const { exitCode, output } = await runCliInDirectory(cwd, ['generate', './openapi.yaml', '--dry-run', '--prune', '--json'])
    const payload = JSON.parse(output) as {
      ok: boolean
      dryRun: boolean
      prune: { enabled: boolean; candidates: Array<{ path: string }>; deleted: Array<{ path: string }>; skipped: Array<{ path: string; reason: string }> }
    }

    expect(payload.ok).toBe(true)
    expect(payload.dryRun).toBe(true)
    expect(payload.prune.enabled).toBe(true)
    expect(payload.prune.candidates).toEqual([{ path: 'src/shared/api/generated/legacy/legacy.client.ts' }])
    expect(payload.prune.deleted).toEqual([])
    expect(payload.prune.skipped).toEqual([])
    await expect(readTextFile(join(cwd, 'src/shared/api/generated/legacy/legacy.client.ts'), 'utf8')).resolves.toContain('legacy')
    await expect(readTextFile(join(cwd, 'src/shared/api/generated/legacy/local-helper.ts'), 'utf8')).resolves.toContain('local')
    expect(exitCode).toBeUndefined()
  })

  test('generate prune deletes only stale marker-owned files', async () => {
    const cwd = await tempDir()
    await mkdir(join(cwd, 'src/shared/api/generated/legacy'), { recursive: true })
    await writeFile(join(cwd, 'openapi.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Prune API\n  version: 1.0.0\npaths: {}\n', 'utf8')
    await writeFile(join(cwd, 'src/shared/api/generated/legacy/legacy.client.ts'), '// @archora-forge-generated\nexport const legacy = true\n', 'utf8')
    await writeFile(join(cwd, 'src/shared/api/generated/legacy/local-helper.ts'), 'export const local = true\n', 'utf8')

    const { exitCode, output } = await runCliInDirectory(cwd, ['generate', './openapi.yaml', '--prune', '--json'])
    const payload = JSON.parse(output) as {
      ok: boolean
      dryRun: boolean
      prune: { enabled: boolean; candidates: Array<{ path: string }>; deleted: Array<{ path: string }>; skipped: Array<{ path: string; reason: string }> }
    }

    expect(payload.ok).toBe(true)
    expect(payload.dryRun).toBe(false)
    expect(payload.prune.enabled).toBe(true)
    expect(payload.prune.candidates).toEqual([{ path: 'src/shared/api/generated/legacy/legacy.client.ts' }])
    expect(payload.prune.deleted).toEqual([{ path: 'src/shared/api/generated/legacy/legacy.client.ts' }])
    expect(payload.prune.skipped).toEqual([])
    await expect(readTextFile(join(cwd, 'src/shared/api/generated/legacy/legacy.client.ts'), 'utf8')).rejects.toThrow()
    await expect(readTextFile(join(cwd, 'src/shared/api/generated/legacy/local-helper.ts'), 'utf8')).resolves.toContain('local')
    expect(exitCode).toBeUndefined()
  })

  test('generate dry-run can aggregate configured multi-schema inputs', async () => {
    const cwd = await tempDir()
    await mkdir(join(cwd, 'contracts'), { recursive: true })
    await writeFile(join(cwd, 'contracts/users.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Users API\n  version: 1.0.0\npaths: {}\n', 'utf8')
    await writeFile(join(cwd, 'contracts/billing.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Billing API\n  version: 1.0.0\npaths: {}\n', 'utf8')
    await writeFile(
      join(cwd, 'archora-forge.config.ts'),
      [
        "import { defineForgeConfig } from '@archora/forge-cli'",
        '',
        'export default defineForgeConfig({',
        '  inputs: [',
        "    { name: 'users', path: './contracts/users.yaml', output: { generatedDir: './src/users/generated' } },",
        "    { name: 'billing', path: './contracts/billing.yaml', output: { generatedDir: './src/billing/generated' } },",
        '  ],',
        '})',
        '',
      ].join('\n'),
      'utf8',
    )

    const { exitCode, output } = await runCliInDirectory(cwd, ['generate', '--dry-run', '--json'])
    const payload = JSON.parse(output) as {
      ok: boolean
      dryRun: boolean
      schemas: Array<{ name: string; files: { planned: { create: number }; result: { created: number } } }>
      files: { planned: { create: number }; result: { created: number; protected: number } }
    }

    expect(payload.ok).toBe(true)
    expect(payload.dryRun).toBe(true)
    expect(payload.schemas.map((schema) => schema.name)).toEqual(['users', 'billing'])
    expect(payload.schemas.map((schema) => schema.files.planned.create)).toEqual([1, 1])
    expect(payload.files.planned.create).toBe(2)
    expect(payload.files.result.created).toBe(2)
    expect(payload.files.result.protected).toBe(0)
    expect(exitCode).toBeUndefined()
  })

  test('generate refuses multi-schema inputs with duplicate output paths', async () => {
    const cwd = await tempDir()
    await mkdir(join(cwd, 'contracts'), { recursive: true })
    await writeFile(join(cwd, 'contracts/users.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Users API\n  version: 1.0.0\npaths: {}\n', 'utf8')
    await writeFile(join(cwd, 'contracts/billing.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Billing API\n  version: 1.0.0\npaths: {}\n', 'utf8')
    await writeFile(
      join(cwd, 'archora-forge.config.ts'),
      [
        "import { defineForgeConfig } from '@archora/forge-cli'",
        '',
        'export default defineForgeConfig({',
        '  inputs: [',
        "    { name: 'users', path: './contracts/users.yaml' },",
        "    { name: 'billing', path: './contracts/billing.yaml' },",
        '  ],',
        '})',
        '',
      ].join('\n'),
      'utf8',
    )

    await expect(runCliInDirectory(cwd, ['generate', '--dry-run', '--json'])).rejects.toThrow(
      'Multi-schema generation would write duplicate paths',
    )
  })

  test('generate dry-run can write a JSON summary report', async () => {
    const cwd = await tempDir()
    const reportPath = join(cwd, 'forge-generate.json')
    await writeFile(join(cwd, 'openapi.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Generate Report API\n  version: 1.0.0\npaths: {}\n', 'utf8')

    const { exitCode, output } = await runCliInDirectory(cwd, ['generate', './openapi.yaml', '--dry-run', '--json', '--report-file', reportPath])
    const payload = JSON.parse(await readTextFile(reportPath, 'utf8')) as { ok: boolean; dryRun: boolean; files: { result: { created: number } } }

    expect(payload.ok).toBe(true)
    expect(payload.dryRun).toBe(true)
    expect(payload.files.result.created).toBeGreaterThan(0)
    expect(output).toContain(`Report written: ${reportPath}`)
    expect(exitCode).toBeUndefined()
  })

  test('cli resolves config input relative to explicit config file', async () => {
    const cwd = await tempDir()
    const projectDir = join(cwd, 'project')
    await mkdir(projectDir, { recursive: true })
    await writeFile(join(projectDir, 'openapi.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Explicit Config API\n  version: 1.0.0\npaths: {}\n', 'utf8')
    await writeFile(
      join(projectDir, 'archora-forge.config.ts'),
      "import { defineForgeConfig } from '@archora/forge-cli'\n\nexport default defineForgeConfig({ input: './openapi.yaml' })\n",
      'utf8',
    )

    const { exitCode, output } = await runCliInDirectory(cwd, ['inspect', '--config', join(projectDir, 'archora-forge.config.ts')])

    expect(output).toContain(`Schema loaded: ${join(projectDir, 'openapi.yaml')}`)
    expect(exitCode).toBeUndefined()
  })

  test('check command honors ci failOnDrift policy from config', async () => {
    const cwd = await tempDir()
    await writeFile(join(cwd, 'openapi.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Drift Policy API\n  version: 1.0.0\npaths: {}\n', 'utf8')
    await writeFile(
      join(cwd, 'archora-forge.config.ts'),
      "import { defineForgeConfig } from '@archora/forge-cli'\n\nexport default defineForgeConfig({ input: './openapi.yaml', ci: { failOnDrift: false } })\n",
      'utf8',
    )

    const { exitCode, output } = await runCliInDirectory(cwd, ['check', '--json'])
    const payload = JSON.parse(output) as { ok: boolean; failedChecks: string[]; drift: unknown[] }

    expect(payload.drift.length).toBeGreaterThan(0)
    expect(payload.ok).toBe(true)
    expect(payload.failedChecks).toEqual([])
    expect(exitCode).toBe(0)
  })

  test('check command honors ci failOnMissingSchemas policy from config', async () => {
    const cwd = await tempDir()
    await writeFile(
      join(cwd, 'openapi.yaml'),
      [
        'openapi: 3.0.3',
        'info:',
        '  title: Missing Schema Policy API',
        '  version: 1.0.0',
        'paths:',
        '  /users:',
        '    get:',
        '      tags: [Users]',
        '      operationId: listUsers',
        '      requestBody:',
        '        content:',
        '          application/json: {}',
        '      responses:',
        "        '200':",
        '          description: Empty success response',
        '',
      ].join('\n'),
      'utf8',
    )
    await writeFile(
      join(cwd, 'archora-forge.config.ts'),
      "import { defineForgeConfig } from '@archora/forge-cli'\n\nexport default defineForgeConfig({ input: './openapi.yaml', ci: { failOnDrift: false, failOnUnsupportedFeatures: false, failOnMissingSchemas: true } })\n",
      'utf8',
    )

    const { exitCode, output } = await runCliInDirectory(cwd, ['check', '--json'])
    const payload = JSON.parse(output) as { ok: boolean; failedChecks: string[] }

    expect(payload.ok).toBe(false)
    expect(payload.failedChecks).toContain('missing-schemas')
    expect(exitCode).toBe(1)
  })

  test('check command honors ci minHealthScore policy from config', async () => {
    const cwd = await tempDir()
    await writeFile(
      join(cwd, 'openapi.yaml'),
      [
        'openapi: 3.0.3',
        'info:',
        '  title: Health Gate API',
        '  version: 1.0.0',
        'paths:',
        '  /users:',
        '    get:',
        '      tags: [Users]',
        '      operationId: listUsers',
        '      responses:',
        "        '200':",
        '          description: Users',
        '          content:',
        '            application/json:',
        '              schema:',
        '                type: object',
        '',
      ].join('\n'),
      'utf8',
    )
    await writeFile(
      join(cwd, 'archora-forge.config.ts'),
      "import { defineForgeConfig } from '@archora/forge-cli'\n\nexport default defineForgeConfig({ input: './openapi.yaml', ci: { failOnDrift: false, minHealthScore: 100 } })\n",
      'utf8',
    )

    const { exitCode, output } = await runCliInDirectory(cwd, ['check', '--json'])
    const payload = JSON.parse(output) as { ok: boolean; failedChecks: string[]; healthScore: number }

    expect(payload.ok).toBe(false)
    expect(payload.failedChecks).toContain('health-score')
    expect(payload.healthScore).toBeLessThan(100)
    expect(exitCode).toBe(1)
  })

  test('check command supports a min health score CLI override', async () => {
    const cwd = await tempDir()
    await writeFile(
      join(cwd, 'openapi.yaml'),
      [
        'openapi: 3.0.3',
        'info:',
        '  title: CLI Health Gate API',
        '  version: 1.0.0',
        'paths:',
        '  /users:',
        '    get:',
        '      tags: [Users]',
        '      operationId: listUsers',
        '      responses:',
        "        '200':",
        '          description: Users',
        '          content:',
        '            application/json:',
        '              schema:',
        '                type: object',
        '',
      ].join('\n'),
      'utf8',
    )

    const { exitCode, output } = await runCliInDirectory(cwd, ['check', './openapi.yaml', '--json', '--min-health-score', '100'])
    const payload = JSON.parse(output) as { ok: boolean; failedChecks: string[]; healthScore: number }

    expect(payload.ok).toBe(false)
    expect(payload.failedChecks).toContain('health-score')
    expect(payload.healthScore).toBeLessThan(100)
    expect(exitCode).toBe(1)
  })

  test('check command can aggregate configured multi-schema inputs', async () => {
    const cwd = await tempDir()
    await mkdir(join(cwd, 'contracts'), { recursive: true })
    await writeFile(join(cwd, 'contracts/users.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Users API\n  version: 1.0.0\npaths: {}\n', 'utf8')
    await writeFile(join(cwd, 'contracts/billing.yaml'), 'openapi: 3.0.3\ninfo:\n  title: Billing API\n  version: 1.0.0\npaths: {}\n', 'utf8')
    await writeFile(
      join(cwd, 'archora-forge.config.ts'),
      [
        "import { defineForgeConfig } from '@archora/forge-cli'",
        '',
        'export default defineForgeConfig({',
        '  inputs: [',
        "    { name: 'users', path: './contracts/users.yaml' },",
        "    { name: 'billing', path: './contracts/billing.yaml' },",
        '  ],',
        '  ci: { failOnDrift: false },',
        '})',
        '',
      ].join('\n'),
      'utf8',
    )

    const { exitCode, output } = await runCliInDirectory(cwd, ['check', '--json'])
    const payload = JSON.parse(output) as {
      ok: boolean
      schemas: Array<{ name: string; schema: string; generatedFiles: number; driftCount: number; failedChecks: string[] }>
      generatedFiles: number
    }

    expect(payload.ok).toBe(true)
    expect(payload.schemas.map((schema) => schema.name)).toEqual(['users', 'billing'])
    expect(payload.schemas.map((schema) => schema.generatedFiles)).toEqual([1, 1])
    expect(payload.schemas.map((schema) => schema.driftCount)).toEqual([1, 1])
    expect(payload.schemas.flatMap((schema) => schema.failedChecks)).toEqual([])
    expect(payload.generatedFiles).toBe(2)
    expect(exitCode).toBe(0)
  })

  test('generated promise helpers and Zod validation artifacts typecheck in an isolated consumer', async () => {
    const normalized = normalizeOpenApi(crudSchema)
    const resources = detectResources(normalized.operations)
    const cwd = await tempDir()
    const plan = await createGenerationPlan({
      config: resolveForgeConfig({
        input: './openapi.yaml',
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

  test('generated operation helpers with unsafe parameter names typecheck in an isolated consumer', async () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Unsafe Params API', version: '1.0.0' },
      paths: {
        '/search/{tenant-id}': {
          post: {
            operationId: 'search.create',
            tags: ['Search'],
            parameters: [
              { name: 'tenant-id', in: 'path', required: true, schema: { type: 'string' } },
              { name: 'X-Tenant-ID', in: 'header', required: true, schema: { type: 'string' } },
              { name: 'sort.field', in: 'query', schema: { type: 'string' } },
            ],
            requestBody: {
              content: {
                'application/json': {
                  schema: { type: 'object', required: ['query'], properties: { query: { type: 'string' } } },
                },
              },
            },
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', items: { type: 'string' } } } },
                  },
                },
              },
            },
          },
        },
      },
    })
    const resources = detectResources(normalized.operations)
    const cwd = await tempDir()
    const plan = await createGenerationPlan({
      config: resolveForgeConfig({ input: './openapi.yaml' }),
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

  test('generated Valibot validation artifacts typecheck in an isolated consumer', async () => {
    const normalized = normalizeOpenApi(crudSchema)
    const resources = detectResources(normalized.operations)
    const cwd = await tempDir()
    const plan = await createGenerationPlan({
      config: resolveForgeConfig({
        input: './openapi.yaml',
        validation: 'valibot',
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
              valibot: ['packages/core/node_modules/valibot'],
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

  test('ui target no longer emits runtime component adapters in framework-neutral output', async () => {
    const normalized = normalizeOpenApi(crudSchema)
    const resources = detectResources(normalized.operations)
    const fallbackPlan = await createGenerationPlan({
      config: resolveForgeConfig({ input: './openapi.yaml' }),
      normalized,
      resources,
      cwd: await tempDir(),
    })
    const customUiPlan = await createGenerationPlan({
      config: resolveForgeConfig({ input: './openapi.yaml', target: { ui: 'custom' } }),
      normalized,
      resources,
      cwd: await tempDir(),
    })

    expect(fallbackPlan.files.some((file) => file.path.endsWith('archora-ui.ts'))).toBe(false)
    expect(customUiPlan.files.some((file) => file.path.endsWith('archora-ui.ts'))).toBe(false)
    expect(fallbackPlan.files.some((file) => file.path.endsWith('.vue'))).toBe(false)
    expect(customUiPlan.files.some((file) => file.path.endsWith('.vue'))).toBe(false)
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
    expect(diff.changelog).toEqual(
      expect.arrayContaining([
        expect.stringContaining('BREAKING users'),
        expect.stringContaining('resource contract files affected'),
      ]),
    )
    expect(diff.decision).toMatchObject({
      status: 'blocked',
      mergeRisk: 'high',
    })
    expect(diff.summary.breaking).toBeGreaterThan(0)
    expect(diff.impactedSurface.operationIds).toEqual(expect.arrayContaining(['createUser']))
    expect(diff.migrationHints).toEqual(
      expect.arrayContaining([
        expect.stringContaining('required'),
        expect.stringContaining('Enum value'),
      ]),
    )
    expect(diff.prSummary).toContain('Frontend API impact: blocked')
  })

  test('lint reports stricter frontend generation quality issues', () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Strict Lint API', version: '1.0.0' },
      paths: {
        '/users/{id}': {
          get: {
            operationId: 'getUser',
            tags: ['Users'],
            responses: { '200': { description: 'User', content: { 'application/json': { schema: { type: 'object' } } } } },
          },
        },
        '/reports/export': {
          get: {
            operationId: 'getUser',
            tags: ['Reports', 'Exports'],
            responses: { '200': { description: 'Export', content: { 'application/json': { schema: { type: 'object' } } } } },
          },
        },
      },
    })

    const report = lintOpenApi(normalized, { strict: true })
    const codes = report.diagnostics.map((diagnostic) => diagnostic.code)

    expect(codes).toEqual(expect.arrayContaining(['duplicate-operation-id', 'path-template-parameter-missing', 'multiple-resource-tags']))
    expect(report.ok).toBe(false)
  })

  test('config presets provide common repository layouts', () => {
    const featureSliced = resolveForgeConfig(createForgeConfigPreset('feature-sliced', { input: './openapi.yaml' }))
    const simple = resolveForgeConfig(createForgeConfigPreset('simple', { input: './openapi.yaml' }))
    const monorepo = resolveForgeConfig(
      createForgeConfigPreset('monorepo', {
        inputs: [
          { name: 'users', path: './contracts/users.yaml' },
          { name: 'billing', path: './contracts/billing.yaml' },
        ],
      }),
    )

    expect(featureSliced.output.featuresDir).toBe('./src/features')
    expect(simple.output.featuresDir).toBe('./src/api/features')
    expect(simple.target.architecture).toBe('simple')
    expect(monorepo.inputs.map((input) => input.output?.generatedDir)).toEqual(['./src/generated/users', './src/generated/billing'])
  })

  test('generated artifacts avoid private-corpus typecheck traps', async () => {
    const cwd = await tempDir()
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Typecheck Trap API', version: '1.0.0' },
      paths: {
        '/records': {
          get: {
            operationId: 'listRecords',
            tags: ['Records'],
            responses: { '200': { description: 'Records', content: { 'application/json': { schema: { type: 'array', items: { type: 'object' } } } } } },
          },
        },
        '/reset-password': {
          post: {
            operationId: 'resetPass',
            tags: ['ResetPassAction'],
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      'new-password': { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: { '200': { description: 'OK' } },
          },
        },
        '/types': {
          post: {
            operationId: 'createType',
            tags: ['Types'],
            responses: { '200': { description: 'Type', content: { 'application/json': { schema: { type: 'object' } } } } },
          },
        },
        '/services/{name}/goal/{code}': {
          delete: {
            operationId: 'deleteGoal',
            tags: ['Goal'],
            parameters: [
              { name: 'name', in: 'path', required: true, schema: { type: 'string' } },
              { name: 'code', in: 'path', required: true, schema: { type: 'string' } },
            ],
            responses: { '204': { description: 'Deleted' } },
          },
        },
      },
    })
    const resources = detectResources(normalized.operations)
    const plan = await createGenerationPlan({ config: resolveForgeConfig({ input: './openapi.yaml' }), normalized, resources, cwd })

    expect(readFile(plan, 'records.fixtures.ts')).toContain('type RecordFixture = Record<string, unknown>')
    expect(plan.files.map((file) => file.content).join('\n')).toContain("'new-password': 'New-password'")
    expect(readFile(plan, 'types.types.ts')).toContain('export type CreateTypeValueRequest = Partial<TypeValue>')
    expect(readFile(plan, 'useDeleteGoalMutation.ts')).toContain('goalQueryKeys.detail(id)')
  })

  test('contract-diff command can write a JSON report file for CI artifacts', async () => {
    const cwd = await tempDir()
    const oldPath = join(cwd, 'old-openapi.json')
    const newPath = join(cwd, 'new-openapi.json')
    const reportPath = join(cwd, 'contract-diff.json')
    const nextSchema = {
      ...crudSchema,
      paths: {
        '/users': {
          get: crudSchema.paths['/users'].get,
        },
      },
    }
    await writeFile(oldPath, JSON.stringify(crudSchema), 'utf8')
    await writeFile(newPath, JSON.stringify(nextSchema), 'utf8')

    const { exitCode, output } = await runCliInDirectory(cwd, ['contract-diff', oldPath, newPath, '--json', '--report-file', reportPath])
    const payload = JSON.parse(await readTextFile(reportPath, 'utf8')) as {
      ok: boolean
      oldSchema: string
      newSchema: string
      changes: Array<{ severity: string }>
      affectedResources: string[]
    }

    expect(payload.ok).toBe(false)
    expect(payload.oldSchema).toBe(oldPath)
    expect(payload.newSchema).toBe(newPath)
    expect(payload.changes.some((change) => change.severity === 'breaking')).toBe(true)
    expect(payload.affectedResources).toContain('users')
    expect(output).toContain(`Report written: ${reportPath}`)
    expect(exitCode).toBe(1)
  })

  test('impact command writes Markdown and HTML frontend impact artifacts', async () => {
    const cwd = await tempDir()
    const oldPath = join(cwd, 'old-openapi.json')
    const newPath = join(cwd, 'new-openapi.json')
    const markdownPath = join(cwd, 'impact.md')
    const htmlPath = join(cwd, 'impact.html')
    const nextSchema = {
      ...crudSchema,
      components: {
        schemas: {
          ...crudSchema.components.schemas,
          CreateUserDto: {
            ...crudSchema.components.schemas.CreateUserDto,
            required: ['email', 'status', 'role'],
            properties: {
              ...crudSchema.components.schemas.CreateUserDto.properties,
              role: { type: 'string' },
            },
          },
        },
      },
    }
    await writeFile(oldPath, JSON.stringify(crudSchema), 'utf8')
    await writeFile(newPath, JSON.stringify(nextSchema), 'utf8')

    const markdown = await runCliInDirectory(cwd, ['impact', oldPath, newPath, '--report', 'markdown', '--report-file', markdownPath])
    const html = await runCliInDirectory(cwd, ['impact', oldPath, newPath, '--report', 'html', '--report-file', htmlPath])
    const markdownReport = await readTextFile(markdownPath, 'utf8')
    const htmlReport = await readTextFile(htmlPath, 'utf8')

    expect(markdown.exitCode).toBe(1)
    expect(markdown.output).toContain(`Report written: ${markdownPath}`)
    expect(markdownReport).toContain('# Frontend API Impact')
    expect(markdownReport).toContain('Decision: blocked')
    expect(markdownReport).toContain('Field "role" became required.')
    expect(html.exitCode).toBe(1)
    expect(htmlReport).toContain('Frontend Impact Center')
    expect(htmlReport).toContain('Merge risk')
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
      name: 'product-regression-test-plugin',
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

  test('lint keeps regression fixture score useful and avoids missing response-schema noise', async () => {
    const normalized = normalizeOpenApi(await parseOpenApi(join(process.cwd(), 'test/fixtures/openapi/basic-crud.yaml')))
    const report = lintOpenApi(normalized)
    const diagnosticKeys = report.diagnostics.map((diagnostic) => `${diagnostic.code}:${diagnostic.location ?? ''}`)

    expect(report.score).toBeGreaterThanOrEqual(70)
    expect(new Set(diagnosticKeys).size).toBe(diagnosticKeys.length)
    expect(report.diagnostics.filter((diagnostic) => diagnostic.code === 'missing-response-schema')).toHaveLength(0)
  })

  test('check report includes schema coverage matrix for adoption review', async () => {
    const cwd = await tempDir()
    await writeFile(
      join(cwd, 'openapi.yaml'),
      JSON.stringify({
        openapi: '3.0.3',
        info: { title: 'Coverage API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              operationId: 'listUsers',
              tags: ['Users'],
              responses: {
                '200': {
                  description: 'Users',
                  content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } },
                },
              },
            },
            post: {
              operationId: 'createUser',
              tags: ['Users'],
              requestBody: {
                content: { 'text/plain': { schema: { type: 'string' } } },
              },
              responses: {
                '201': {
                  description: 'Created',
                  content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
                },
              },
            },
          },
          '/users/export': {
            get: {
              operationId: 'exportUsers',
              tags: ['Users'],
              responses: {
                '200': {
                  description: 'Export',
                  content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } },
                },
              },
            },
          },
          '/legacy/ping': {
            head: {
              operationId: 'headPing',
              tags: ['Legacy'],
              responses: { '204': { description: 'No content' } },
            },
          },
        },
        components: {
          schemas: {
            User: {
              type: 'object',
              required: ['id', 'status'],
              properties: {
                id: { type: 'string' },
                status: { oneOf: [{ type: 'string' }, { type: 'integer' }] },
              },
            },
          },
        },
      }),
      'utf8',
    )

    const { output } = await runCliInDirectory(cwd, ['check', './openapi.yaml', '--json'])
    const payload = JSON.parse(output) as {
      coverage: {
        operations: {
          total: number
          generated: number
          diagnosticOnly: number
          byKind: Record<string, number>
          byRequestShape: Record<string, number>
          byResponseShape: Record<string, number>
        }
        schemas: {
          total: number
          unsupportedConstructs: Record<string, number>
        }
        cases: {
          generated: number
          skipped: number
          fallback: number
          diagnosticOnly: number
        }
      }
    }

    expect(payload.coverage.operations.total).toBe(4)
    expect(payload.coverage.operations.generated).toBe(3)
    expect(payload.coverage.operations.diagnosticOnly).toBe(1)
    expect(payload.coverage.operations.byKind).toMatchObject({
      'crud-resource': 2,
      'file-operation': 1,
      'unsupported-operation': 1,
    })
    expect(payload.coverage.operations.byRequestShape).toMatchObject({
      none: 3,
      text: 1,
    })
    expect(payload.coverage.operations.byResponseShape).toMatchObject({
      json: 2,
      binary: 1,
      empty: 1,
    })
    expect(payload.coverage.schemas.unsupportedConstructs).toMatchObject({
      oneOf: 1,
    })
    expect(payload.coverage.cases).toMatchObject({
      generated: 3,
      skipped: 1,
      fallback: 1,
      diagnosticOnly: 2,
    })
  })

  test('audit command writes a self-serve adoption package', async () => {
    const cwd = await tempDir()
    const schemaPath = join(cwd, 'openapi.yaml')
    const outDir = join(cwd, 'forge-audit')
    await writeFile(schemaPath, JSON.stringify(crudSchema), 'utf8')

    const { exitCode, output } = await runCliInDirectory(cwd, ['audit', './openapi.yaml', '--json', '--skip-typecheck', '--out', outDir])
    const payload = JSON.parse(output) as {
      ok: boolean
      audit: { artifacts: string[] }
      scorecard: Record<string, number>
      typecheck: { status: string }
      resourceExplorer: Array<{ name: string; generatedFiles: string[] }>
    }

    expect(exitCode).toBe(1)
    expect(payload.ok).toBe(false)
    expect(payload.typecheck.status).toBe('skipped')
    expect(payload.scorecard.resourceCoverage).toBe(100)
    expect(payload.resourceExplorer.map((resource) => resource.name)).toContain('users')
    expect(payload.audit.artifacts).toContain('index.html')
    expect(await readTextFile(join(outDir, 'index.html'), 'utf8')).toContain('Resource Explorer')
    expect(await readTextFile(join(outDir, 'report.md'), 'utf8')).toContain('frontendReadiness')
    expect(await readTextFile(join(outDir, 'typecheck.md'), 'utf8')).toContain('skipped')
    expect(await readTextFile(join(outDir, 'ci.yml'), 'utf8')).toContain('archora-forge audit')
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
