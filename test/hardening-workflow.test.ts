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
} from '../packages/core/src/index.js'
import { resolveForgeConfig } from '../packages/config/src/index.js'
import { createApiClient, ForgeHttpError } from '../packages/runtime/src/index.js'

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
    expect(types).toContain("import type { UserProfile } from '../components.types'")
    expect(types).not.toMatch(/^export interface UserProfile\s*\{/m)
    expect(client).toContain('getUser: (params?: UsersListParams) => Promise<unknown>')
    expect(client).toContain('usersList: (params: { teamId: string; userId: string }) => Promise<UserDetailResponse>')
    expect(client).toContain('`/teams/${params.teamId}/users/${params.userId}`')
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(['missing-response-schema', 'unsupported-content-type', 'unsupported-oneof', 'unsupported-security-schemes']),
    )
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
    await expect(client.request('POST', '/users', { body: { email: 'a@example.test' }, headers: { 'x-local': 'yes' } })).resolves.toEqual({ ok: true })
    await expect(client.request('DELETE', '/empty')).resolves.toBeUndefined()
    await expect(client.request('GET', '/fail')).rejects.toBeInstanceOf(ForgeHttpError)

    expect(calls[0]?.url).toBe('https://api.test/users?page=2&tag=a&tag=b')
    expect(calls[1]?.init.method).toBe('POST')
    expect(calls[1]?.init.body).toBe(JSON.stringify({ email: 'a@example.test' }))
    expect(calls[1]?.init.headers).toMatchObject({ 'content-type': 'application/json', 'x-static': 'yes', 'x-local': 'yes' })
  })

  test('drift calculation flags missing and outdated generated files while ignoring custom wrappers', async () => {
    const cwd = await tempDir()
    const normalized = normalizeOpenApi(hardeningSchema)
    const plan = await createGenerationPlan({
      config: resolveForgeConfig({ input: './openapi.yaml' }),
      normalized,
      resources: detectResources(normalized.operations),
      cwd,
    })
    const generated = plan.files.find((entry) => entry.path.endsWith('users.types.ts'))
    const custom = plan.files.find((entry) => entry.path.endsWith('UsersTable.vue'))
    if (!generated || !custom) throw new Error('Expected generated and custom files')
    await mkdir(join(cwd, generated.path, '..'), { recursive: true })
    await writeFile(join(cwd, generated.path), 'outdated\n', 'utf8')
    await mkdir(join(cwd, custom.path, '..'), { recursive: true })
    await writeFile(join(cwd, custom.path), '<template>custom</template>\n', 'utf8')

    const drift = await calculateDrift(plan.files, { cwd })

    expect(drift).toEqual(expect.arrayContaining([expect.objectContaining({ path: generated.path, kind: 'outdated' })]))
    expect(drift.some((entry) => entry.path === custom.path)).toBe(false)
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
    ]

    for (const fixture of fixtures) {
      const { parseOpenApi } = await import('../packages/core/src/index.js')
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
})

function file(plan: Awaited<ReturnType<typeof createGenerationPlan>>, suffix: string): string {
  return plan.files.find((entry) => entry.path.endsWith(suffix))?.content ?? ''
}

async function tempDir(): Promise<string> {
  const dir = join(tmpdir(), `archora-forge-${crypto.randomUUID()}`)
  await mkdir(dir, { recursive: true })
  return dir
}
