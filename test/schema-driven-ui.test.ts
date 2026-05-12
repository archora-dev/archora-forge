import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { describe, expect, test } from 'vitest'

import {
  createGenerationPlan,
  createResourceUiModel,
  detectResources,
  normalizeOpenApi,
  summarizeFilePlan,
} from '../packages/core/src/index.js'
import { resolveForgeConfig } from '../packages/config/src/index.js'
import { mapArchoraUiField, mapArchoraUiTableCell } from '../packages/adapters/src/index.js'

const realWorldSchema = {
  openapi: '3.0.3',
  info: { title: 'Real API', version: '1.0.0' },
  paths: {
    '/users': {
      get: {
        operationId: 'listUsers',
        tags: ['Users'],
        responses: {
          '200': {
            description: 'Paginated users',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    items: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/User' },
                    },
                    total: { type: 'integer' },
                    page: { type: 'integer' },
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
        responses: { '201': { description: 'Created' } },
      },
    },
    '/users/{id}': {
      get: {
        operationId: 'getUser',
        tags: ['Users'],
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
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas.UpdateUserDto' },
            },
          },
        },
        responses: { '200': { description: 'Updated' } },
      },
      delete: {
        tags: ['Users'],
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
          email: { type: 'string', format: 'email', description: 'Work email', maxLength: 120 },
          name: { type: 'string', minLength: 2, maxLength: 80 },
          age: { type: 'integer', minimum: 18, nullable: true },
          status: { type: 'string', enum: ['active', 'blocked', 'pending'] },
          verified: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time', readOnly: true },
          password: { type: 'string', writeOnly: true, minLength: 12 },
          profile: {
            type: 'object',
            properties: {
              city: { type: 'string' },
            },
          },
        },
      },
      CreateUserDto: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', description: 'Invitation email' },
          password: { type: 'string', writeOnly: true, minLength: 12 },
          status: { type: 'string', enum: ['active', 'blocked', 'pending'] },
          verified: { type: 'boolean' },
        },
      },
      UpdateUserDto: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          status: { type: 'string', enum: ['active', 'blocked', 'pending'] },
        },
      },
    },
  },
}

describe('Schema-driven UI model', () => {
  test('centralizes Archora UI adapter mappings', () => {
    expect(mapArchoraUiField({ type: 'string', format: 'email' })).toEqual({
      input: 'email',
      component: 'ArchInput',
    })
    expect(mapArchoraUiField({ type: 'string', enum: ['active'] })).toEqual({
      input: 'select',
      component: 'ArchSelect',
    })
    expect(mapArchoraUiTableCell({ type: 'boolean' })).toBe('boolean')
    expect(mapArchoraUiTableCell({ type: 'object' })).toBe('json')
  })

  test('maps form fields from schema with validation and readOnly filtering', () => {
    const normalized = normalizeOpenApi(realWorldSchema)
    const resource = detectResources(normalized.operations)[0]
    const model = createResourceUiModel({
      normalized,
      resource,
      config: {
        form: { fields: ['email', 'password', 'status', 'verified', 'id'] },
      },
    })

    expect(model.formFields.map((field) => field.name)).toEqual(['email', 'password', 'status', 'verified'])
    expect(model.formFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'email', input: 'email', component: 'ArchInput', required: true }),
        expect.objectContaining({ name: 'password', input: 'password', component: 'ArchInput', required: true }),
        expect.objectContaining({ name: 'status', input: 'select', component: 'ArchSelect', enumValues: ['active', 'blocked', 'pending'] }),
        expect.objectContaining({ name: 'verified', input: 'switch', component: 'ArchSwitch' }),
      ]),
    )
    expect(model.formFields.find((field) => field.name === 'password')?.validation.minLength).toBe(12)
    expect(model.formFields.find((field) => field.name === 'email')?.hint).toBe('Invitation email')
  })

  test('maps table columns from response schema and excludes writeOnly fields', () => {
    const normalized = normalizeOpenApi(realWorldSchema)
    const resource = detectResources(normalized.operations)[0]
    const model = createResourceUiModel({
      normalized,
      resource,
      config: {
        table: { columns: ['email', 'status', 'verified', 'createdAt', 'profile', 'password'] },
      },
    })

    expect(model.tableColumns.map((column) => column.name)).toEqual(['email', 'status', 'verified', 'createdAt', 'profile'])
    expect(model.tableColumns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'email', cell: 'text' }),
        expect.objectContaining({ name: 'status', cell: 'badge' }),
        expect.objectContaining({ name: 'verified', cell: 'boolean' }),
        expect.objectContaining({ name: 'createdAt', cell: 'dateTime' }),
        expect.objectContaining({ name: 'profile', cell: 'json' }),
      ]),
    )
    expect(model.pagination.enabled).toBe(true)
  })

  test('generates polished formatted form and table output while protecting custom wrappers', async () => {
    const cwd = await createTempDir()
    await mkdir(join(cwd, 'src/features/users/ui'), { recursive: true })
    await writeFile(join(cwd, 'src/features/users/ui/UsersTable.vue'), '<template>Custom users table</template>\n', 'utf8')

    const normalized = normalizeOpenApi(realWorldSchema)
    const resources = detectResources(normalized.operations)
    const plan = await createGenerationPlan({
      config: resolveForgeConfig({
        input: './openapi.yaml',
        resources: {
          users: {
            table: { columns: ['email', 'status', 'verified', 'createdAt', 'profile'] },
            form: { fields: ['email', 'password', 'status', 'verified'] },
          },
        },
      }),
      normalized,
      resources,
      cwd,
    })
    const summary = summarizeFilePlan(plan.files)
    const form = plan.files.find((file) => file.path.endsWith('UserForm.generated.vue'))?.content ?? ''
    const table = plan.files.find((file) => file.path.endsWith('UsersTable.generated.vue'))?.content ?? ''

    expect(summary.protected).toBe(1)
    expect(form).toContain('const formFields')
    expect(form).toContain('type ModelValue = string | number | boolean | null | undefined')
    expect(form).toContain('const formModel = ref<FormModel>({ ...props.modelValue })')
    expect(form).toContain('function updateField(name: string, value: ModelValue)')
    expect(form).toContain("emit('submit', { ...formModel.value })")
    expect(form).toContain(':model-value="formModel[field.name]"')
    expect(form).toContain('@update:model-value="(value: unknown) => updateField(field.name, value as ModelValue)"')
    expect(form).toContain("component: 'ArchSelect'")
    expect(form).toContain("minLength: 12")
    expect(form).not.toContain("name: 'id'")
    expect(table).toContain('const tableColumns')
    expect(table).toContain("cell: 'badge'")
    expect(table).toContain('formatCellValue')
    expect(table).toContain('function formatDateValue')
    expect(table).toContain('function formatBooleanValue')
    expect(table).toContain('function formatEnumValue')
    expect(table).toContain('function formatNestedValue')
    expect(table).toContain('function formatNullableValue')
    expect(table).toContain('function formatNumberValue')
    expect(table).toContain('Page 1 of 1')
    expect(table).toContain("{{ props.rows.length }} {{ props.rows.length === 1 ? 'record' : 'records' }}")
    expect(table).not.toContain('Pagination ready')
    expect(table).not.toContain('Total: {{ pagination.totalPath }}')
    expect(table).not.toContain('JSON.stringify(value)')
    expect(table).toContain('Loading users...')
  })

  test('hides table actions when matching CRUD operations are missing', async () => {
    const normalized = normalizeOpenApi({
      ...realWorldSchema,
      paths: {
        '/reports': {
          get: {
            operationId: 'listReports',
            tags: ['Reports'],
            responses: {
              '200': {
                description: 'Reports',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
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
        },
      },
    })
    const plan = await createGenerationPlan({
      config: resolveForgeConfig({ input: './openapi.yaml' }),
      normalized,
      resources: detectResources(normalized.operations),
      cwd: await createTempDir(),
    })
    const table = plan.files.find((file) => file.path.endsWith('ReportsTable.generated.vue'))?.content ?? ''

    expect(table).not.toContain('Create report')
    expect(table).not.toContain('Edit</ArchButton>')
    expect(table).not.toContain('Delete</ArchButton>')
    expect(table).not.toContain('aria-label="Actions"')
  })
})

async function createTempDir(): Promise<string> {
  const dir = await mkdir(join(tmpdir(), `archora-forge-${crypto.randomUUID()}`), { recursive: true })
  if (!dir) {
    throw new Error('Failed to create temp dir')
  }

  return dir
}
