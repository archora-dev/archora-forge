import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { describe, expect, test } from 'vitest'

import {
  createGenerationPlan,
  detectResources,
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

describe('Vue module generation MVP', () => {
  test('plans generated API, feature, mock, page and custom wrapper files', async () => {
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
        'src/features/users/ui/UsersTable.generated.vue',
        'src/features/users/ui/UserForm.generated.vue',
        'src/pages/users/UsersPage.generated.vue',
        'src/pages/users/users.routes.ts',
        'src/shared/mocks/users/users.fixtures.ts',
        'src/shared/mocks/users/users.handlers.ts',
      ]),
    )
  })

  test('writes generated files and skips existing custom files', async () => {
    const cwd = await createTempDir()
    await mkdir(join(cwd, 'src/features/users/ui'), { recursive: true })
    await writeFile(join(cwd, 'src/features/users/ui/UsersTable.vue'), '<template>Custom</template>\n', 'utf8')

    const normalized = normalizeOpenApi(schema)
    const plan = await createGenerationPlan({
      config: resolveForgeConfig({ input: './openapi.yaml' }),
      normalized,
      resources: detectResources(normalized.operations),
      cwd,
    })
    const result = await writeGeneratedFiles(plan.files, { cwd, dryRun: false })

    expect(result.created).toBeGreaterThan(10)
    expect(result.protected).toBe(1)
    await expect(readFile(join(cwd, 'src/shared/api/generated/users/users.client.ts'), 'utf8')).resolves.toContain(
      'listUsers',
    )
    await expect(readFile(join(cwd, 'src/features/users/ui/UsersTable.vue'), 'utf8')).resolves.toBe(
      '<template>Custom</template>\n',
    )
    expect(summarizeFilePlan(plan.files).protected).toBe(1)
  })
})

async function createTempDir(): Promise<string> {
  const dir = await mkdir(join(tmpdir(), `archora-forge-${crypto.randomUUID()}`), { recursive: true })
  if (!dir) {
    throw new Error('Failed to create temp dir')
  }

  return dir
}
