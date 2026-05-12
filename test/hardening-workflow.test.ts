import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { describe, expect, test } from 'vitest'

import {
  calculateDrift,
  collectDiagnostics,
  createGenerationPlan,
  detectResources,
  normalizeOpenApi,
  parseOpenApi,
} from '../packages/core/src/index.js'
import { resolveForgeConfig } from '../packages/config/src/index.js'
import { createApiClient, ForgeHttpError, isForgeHttpError, queryParam } from '../packages/runtime/src/index.js'

const hardeningSchema = {
  openapi: '3.0.3',
  info: { title: 'Hardening API', version: '1.0.0' },
  paths: {
    '/teams/{teamId}/users/{userId}': {
      parameters: [{ name: 'teamId', in: 'path', required: true, schema: { type: 'string' } }],
      get: {
        operationId: 'users.list',
        tags: ['Users'],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'User',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/user-profile' } } },
          },
        },
      },
    },
    '/users': {
      get: {
        operationId: 'get-user',
        tags: ['Users'],
        responses: { '200': { description: 'Users' } },
      },
      post: {
        operationId: '123create user',
        tags: ['Users'],
        requestBody: { content: { 'text/plain': { schema: { type: 'string' } } } },
        responses: {
          '201': {
            description: 'Created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/user-profile' } } },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } },
    schemas: {
      'user-profile': {
        type: 'object',
        required: ['created-at'],
        properties: {
          id: { type: 'string' },
          'created-at': { type: 'string' },
          'x-total-count': { type: 'integer' },
          'user.name': { type: 'string' },
          status: { type: 'string', enum: ['in-progress', 'needs review'] },
        },
      },
      Pet: {
        oneOf: [{ type: 'string' }, { type: 'number' }],
      },
    },
  },
}

describe('Hardening and CI workflow', () => {
  test('sanitizes identifiers, quotes unsafe keys, merges path params and reports diagnostics', async () => {
    const normalized = normalizeOpenApi(hardeningSchema)
    const diagnostics = collectDiagnostics(normalized)
    const plan = await createGenerationPlan({
      config: resolveForgeConfig({ input: './openapi.yaml' }),
      normalized,
      resources: detectResources(normalized.operations),
      cwd: await tempDir(),
    })
    const sharedTypes = file(plan, 'components.types.ts')
    const types = file(plan, 'users.types.ts')
    const client = file(plan, 'users.client.ts')

    expect(sharedTypes).toContain('export interface UserProfile')
    expect(sharedTypes).toContain("'created-at': string")
    expect(sharedTypes).toContain("'x-total-count'?: number")
    expect(sharedTypes).toContain("'user.name'?: string")
    expect(sharedTypes).toContain("export type UserProfileStatus = 'in-progress' | 'needs review'")
    expect(sharedTypes).toContain('export type Pet = string | number')
    expect(types).toContain("import type { UserProfile } from '../components.types'")
    expect(types).not.toMatch(/^export interface UserProfile\s*\{/m)
    expect(types).toContain('export interface UserId')
    expect(types).toContain('teamId: string')
    expect(types).toContain('userId: string')
    expect(types).toContain('export type UsersListResponse = void')
    expect(client).toContain('getUser: (params?: UsersListParams, options?: UsersRequestOptions) => Promise<UsersListResponse>')
    expect(client).toContain('usersList: (params: UserId, options?: UsersRequestOptions) => Promise<UserDetailResponse>')
    expect(client).toContain('options?: UsersRequestOptions')
    expect(client).toContain(') => Promise<UserDetailResponse>')
    expect(client).toContain('`/teams/${encodeURIComponent(String(params.teamId))}/users/${encodeURIComponent(String(params.userId))}`')
    expect(diagnostics.map((diagnostic) => diagnostic.code)).not.toContain('missing-response-schema')
    expect(diagnostics.map((diagnostic) => diagnostic.code)).not.toContain('unsupported-content-type')
    expect(diagnostics.map((diagnostic) => diagnostic.code)).not.toContain('unsupported-security-schemes')
    expect(diagnostics.map((diagnostic) => diagnostic.code)).not.toContain('unsupported-oneof')
  })

  test('runtime performs fetch requests, parses responses and throws ForgeHttpError', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const fetchImpl: typeof fetch = async (url, init) => {
      calls.push({ url: String(url), init: init ?? {} })
      if (String(url).includes('/fail')) {
        return new Response(JSON.stringify({ error: 'bad' }), { status: 422, statusText: 'Unprocessable', headers: { 'content-type': 'application/json' } })
      }
      if (String(url).includes('/empty')) {
        return new Response(null, { status: 204 })
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    const client = createApiClient({ baseUrl: 'https://api.test', headers: { 'x-static': 'yes' }, fetchImpl })

    await expect(client.request('GET', '/users', { params: { page: 2, tag: ['a', 'b'], empty: null } })).resolves.toEqual({ ok: true })
    await expect(client.request('GET', '/users', { params: { tag: queryParam(['a', 'b'], { style: 'form', explode: false }) } })).resolves.toEqual({ ok: true })
    await expect(client.request('POST', '/users', { body: { email: 'a@example.test' }, headers: { 'x-local': 'yes' } })).resolves.toEqual({ ok: true })
    await expect(client.request('DELETE', '/empty')).resolves.toBeUndefined()
    await expect(client.request('GET', '/fail')).rejects.toBeInstanceOf(ForgeHttpError)

    expect(calls[0]?.url).toBe('https://api.test/users?page=2&tag=a&tag=b')
    expect(calls[1]?.url).toBe('https://api.test/users?tag=a%2Cb')
    expect(calls[2]?.init.method).toBe('POST')
    expect(calls[2]?.init.body).toBe(JSON.stringify({ email: 'a@example.test' }))
    expect(calls[2]?.init.headers).toMatchObject({ 'content-type': 'application/json', 'x-static': 'yes', 'x-local': 'yes' })
  })

  test('runtime supports relative URLs when baseUrl is empty', async () => {
    const calls: string[] = []
    const client = createApiClient({
      baseUrl: '',
      fetchImpl: async (url) => {
        calls.push(String(url))
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } })
      },
    })

    await expect(client.request('GET', '/users', { params: { page: 1, tag: ['a', 'b'] } })).resolves.toEqual({ ok: true })

    expect(calls).toEqual(['/users?page=1&tag=a&tag=b'])
  })

  test('runtime exposes request, response and error hooks for tracing', async () => {
    const events: string[] = []
    const client = createApiClient({
      baseUrl: 'https://api.test',
      fetchImpl: async () => new Response(JSON.stringify({ message: 'bad' }), { status: 500, statusText: 'Server Error', headers: { 'content-type': 'application/json' } }),
      onRequest: ({ method, url }) => events.push(`request:${method}:${url}`),
      onResponse: (response) => events.push(`response:${response.status}`),
      onError: (error) => events.push(`error:${isForgeHttpError(error) ? error.status : 'unknown'}`),
    })

    await expect(client.request('GET', '/fail')).rejects.toBeInstanceOf(ForgeHttpError)

    expect(events).toEqual(['request:GET:https://api.test/fail', 'response:500', 'error:500'])
  })

  test('runtime exposes a ForgeHttpError type guard', () => {
    const error = new ForgeHttpError<{ message: string }>({
      status: 404,
      statusText: 'Not Found',
      body: { message: 'Missing' },
      method: 'GET',
      url: 'https://api.test/missing',
    })

    expect(isForgeHttpError(error)).toBe(true)
    if (isForgeHttpError<{ message: string }>(error)) {
      const body: { message: string } = error.body
      expect(body.message).toBe('Missing')
    }
    expect(isForgeHttpError(new Error('network'))).toBe(false)
  })

  test('runtime parses structured +json response bodies', async () => {
    const fetchImpl: typeof fetch = async (url) => {
      if (String(url).includes('/download')) {
        return new Response(new Blob(['file-bytes']), {
          status: 200,
          headers: { 'content-type': 'application/octet-stream' },
        })
      }
      if (String(url).includes('/problem')) {
        return new Response(JSON.stringify({ type: 'validation', title: 'Invalid input' }), {
          status: 400,
          statusText: 'Bad Request',
          headers: { 'content-type': 'application/problem+json' },
        })
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/vnd.api+json' },
      })
    }
    const client = createApiClient({ baseUrl: 'https://api.test', fetchImpl })

    await expect(client.request('GET', '/vendor-json')).resolves.toEqual({ ok: true })
    await expect(client.request('GET', '/download')).resolves.toBeInstanceOf(Blob)
    await expect(client.request('GET', '/problem')).rejects.toMatchObject({
      body: { type: 'validation', title: 'Invalid input' },
    })
  })

  test('runtime retries transient safe-method failures when configured', async () => {
    const calls: Array<{ method: string; url: string }> = []
    const fetchImpl: typeof fetch = async (url, init) => {
      calls.push({ method: String(init?.method), url: String(url) })
      if (String(init?.method) === 'GET' && calls.filter((call) => call.method === 'GET').length < 3) {
        return new Response(JSON.stringify({ message: 'try again' }), {
          status: 503,
          statusText: 'Unavailable',
          headers: { 'content-type': 'application/json' },
        })
      }
      if (String(init?.method) === 'POST') {
        return new Response(JSON.stringify({ message: 'do not retry' }), {
          status: 503,
          statusText: 'Unavailable',
          headers: { 'content-type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    const client = createApiClient({
      baseUrl: 'https://api.test',
      fetchImpl,
      retry: { attempts: 3, delayMs: 0 },
    })

    await expect(client.request('GET', '/eventual')).resolves.toEqual({ ok: true })
    await expect(client.request('POST', '/eventual', { body: { name: 'A' } })).rejects.toBeInstanceOf(ForgeHttpError)

    expect(calls.filter((call) => call.method === 'GET')).toHaveLength(3)
    expect(calls.filter((call) => call.method === 'POST')).toHaveLength(1)
  })

  test('drift calculation flags missing and outdated generated resource-contract files', async () => {
    const cwd = await tempDir()
    const normalized = normalizeOpenApi(hardeningSchema)
    const plan = await createGenerationPlan({
      config: resolveForgeConfig({ input: './openapi.yaml' }),
      normalized,
      resources: detectResources(normalized.operations),
      cwd,
    })
    const generated = plan.files.find((entry) => entry.path.endsWith('users.types.ts'))
    const config = plan.files.find((entry) => entry.path.endsWith('users.config.ts'))
    if (!generated || !config) throw new Error('Expected generated contract files')
    await mkdir(join(cwd, generated.path, '..'), { recursive: true })
    await writeFile(join(cwd, generated.path), 'outdated\n', 'utf8')

    const drift = await calculateDrift(plan.files, { cwd })

    expect(drift).toEqual(expect.arrayContaining([expect.objectContaining({ path: generated.path, kind: 'outdated' })]))
    expect(drift).toEqual(expect.arrayContaining([expect.objectContaining({ path: config.path, kind: 'missing' })]))
    await rm(cwd, { recursive: true, force: true })
  })

  test('real-world fixture suite parses and produces diagnostics/generation plans', async () => {
    const fixtureDir = join(process.cwd(), 'test/fixtures/openapi')
    const fixtures = [
      'basic-crud.yaml',
      'weird-names.yaml',
      'path-params.yaml',
      'missing-schemas.yaml',
      'partial-crud.yaml',
      'unsupported-composition.yaml',
      'unsupported-transport.yaml',
      'nested-and-arrays.yaml',
      'enterprise-registry-style.yaml',
    ]

    for (const fixture of fixtures) {
      const normalized = normalizeOpenApi(await parseOpenApi(join(fixtureDir, fixture)))
      const plan = await createGenerationPlan({
        config: resolveForgeConfig({ input: fixture }),
        normalized,
        resources: detectResources(normalized.operations),
        cwd: await tempDir(),
      })
      expect(plan.files.length).toBeGreaterThan(0)
    }
  })

  test('enterprise registry fixture covers corpus-derived allOf, headers and binary files', async () => {
    const fixture = join(process.cwd(), 'test/fixtures/openapi/enterprise-registry-style.yaml')
    const normalized = normalizeOpenApi(await parseOpenApi(fixture))
    const diagnostics = collectDiagnostics(normalized)
    const plan = await createGenerationPlan({
      config: resolveForgeConfig({ input: fixture }),
      normalized,
      resources: detectResources(normalized.operations),
      cwd: await tempDir(),
    })
    const generated = plan.files.map((entry) => entry.content).join('\n')

    expect(normalized.operations.map((operation) => operation.id)).toEqual([
      'registryPersons_Search',
      'uploadPersonDocument',
      'downloadPersonDocument',
      'approveRegistryPerson',
      'exportRegistryCsv',
    ])
    expect(normalized.schemas.find((schema) => schema.name === 'PersonCard')?.schema.properties).toMatchObject({
      createdAt: { type: 'string', format: 'date-time' },
      fullName: { type: 'string' },
    })
    expect(diagnostics.map((diagnostic) => diagnostic.code)).not.toContain('supported-allof-object-merge')
    expect(diagnostics.map((diagnostic) => diagnostic.code)).not.toContain('missing-response-schema')
    expect(diagnostics.map((diagnostic) => diagnostic.code)).not.toContain('unsupported-content-type')
    expect(diagnostics.map((diagnostic) => diagnostic.code)).not.toContain('unsupported-security-schemes')
    expect(generated).toContain('export interface PersonCard')
    expect(generated).toContain('createdAt: string')
    expect(generated).toContain('fullName: string')
    expect(generated).toContain('file: Blob | File')
    expect(generated).toContain('export type UploadPersonDocumentOperationRequest = FormData')
    expect(generated).toContain('export type DownloadPersonDocumentOperationResponse = Blob')
    expect(generated).toContain('x-tenant-id')
    expect(diagnostics.map((diagnostic) => diagnostic.code)).not.toContain('unsupported-binary-file')
  })
})

function file(plan: Awaited<ReturnType<typeof createGenerationPlan>>, suffix: string): string {
  return plan.files.find((entry) => entry.path.endsWith(suffix))?.content ?? ''
}

async function tempDir(): Promise<string> {
  const dir = join(tmpdir(), `archora-forge-${crypto.randomUUID()}`)
  await mkdir(dir, { recursive: true })
  return dir
}
