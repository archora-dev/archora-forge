import { mkdir } from 'node:fs/promises'
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
import {
  mapMetadataField,
  mapMetadataTableCell,
  toFilterFields,
  toFormFields,
  toTableColumns,
} from '../packages/adapters/src/index.js'

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
          name: { type: 'string', minLength: 2, maxLength: 80, deprecated: true },
          website: { type: 'string', format: 'uri' },
          age: { type: 'integer', minimum: 18, nullable: true },
          status: { type: 'string', enum: ['active', 'blocked', 'pending'], deprecated: true },
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
          website: { type: 'string', format: 'uri' },
          status: { type: 'string', enum: ['active', 'blocked', 'pending'], default: 'pending' },
          verified: { type: 'boolean', default: false },
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
    expect(mapMetadataField({ type: 'string', format: 'email' })).toEqual({
      input: 'email',
      component: 'text',
    })
    expect(mapMetadataField({ type: 'string', format: 'uri' })).toEqual({
      input: 'url',
      component: 'text',
    })
    expect(mapMetadataField({ type: 'string', enum: ['active'] })).toEqual({
      input: 'select',
      component: 'select',
    })
    expect(mapMetadataTableCell({ type: 'boolean' })).toBe('boolean')
    expect(mapMetadataTableCell({ type: 'object' })).toBe('json')
  })

  test('maps generated resource metadata into generic UI-kit adapter contracts', () => {
    const resourceConfig = {
      resource: 'users',
      pagination: { enabled: true, itemsPath: 'items', totalPath: 'total' },
      fields: [
        {
          name: 'email',
          label: 'Email',
          input: 'email',
          component: 'ArchInput',
          required: true,
          nullable: false,
          validation: {},
        },
        {
          name: 'status',
          label: 'Status',
          input: 'select',
          component: 'ArchSelect',
          required: false,
          nullable: false,
          enumValues: ['active', 'blocked'],
          defaultValue: 'active',
          deprecated: true,
          validation: {},
        },
      ],
      columns: [
        { name: 'email', label: 'Email', cell: 'text', sortable: true, nullable: false },
        { name: 'status', label: 'Status', cell: 'badge', sortable: true, nullable: false },
        { name: 'profile', label: 'Profile', cell: 'json', sortable: false, nullable: true },
      ],
    } as const

    expect(toTableColumns(resourceConfig.columns)).toEqual([
      { key: 'email', title: 'Email', cell: 'text', sortable: true, nullable: false },
      { key: 'status', title: 'Status', cell: 'badge', sortable: true, nullable: false },
      { key: 'profile', title: 'Profile', cell: 'json', sortable: false, nullable: true },
    ])
    expect(toFormFields(resourceConfig.fields)).toEqual([
      {
        key: 'email',
        label: 'Email',
        input: 'email',
        required: true,
        nullable: false,
        options: undefined,
        validation: {},
      },
      {
        key: 'status',
        label: 'Status',
        input: 'select',
        required: false,
        nullable: false,
        options: ['active', 'blocked'],
        defaultValue: 'active',
        deprecated: true,
        validation: {},
      },
    ])
    expect(toFilterFields(resourceConfig.fields)).toEqual([
      { key: 'email', label: 'Email', input: 'email', options: undefined },
      { key: 'status', label: 'Status', input: 'select', options: ['active', 'blocked'], defaultValue: 'active', deprecated: true },
    ])
  })

  test('maps form fields from schema with validation and readOnly filtering', () => {
    const normalized = normalizeOpenApi(realWorldSchema)
    const resource = detectResources(normalized.operations)[0]
    const model = createResourceUiModel({
      normalized,
      resource,
      config: {
        form: { fields: ['email', 'password', 'website', 'status', 'verified', 'id'] },
      },
    })

    expect(model.formFields.map((field) => field.name)).toEqual(['email', 'password', 'website', 'status', 'verified'])
    expect(model.formFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'email', input: 'email', component: 'ArchInput', required: true }),
        expect.objectContaining({ name: 'password', input: 'password', component: 'ArchInput', required: true }),
        expect.objectContaining({ name: 'website', input: 'url', component: 'ArchInput' }),
        expect.objectContaining({ name: 'status', input: 'select', component: 'ArchSelect', enumValues: ['active', 'blocked', 'pending'], defaultValue: 'pending' }),
        expect.objectContaining({ name: 'verified', input: 'switch', component: 'ArchSwitch', defaultValue: false }),
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
        expect.objectContaining({ name: 'status', cell: 'badge', deprecated: true }),
        expect.objectContaining({ name: 'verified', cell: 'boolean' }),
        expect.objectContaining({ name: 'createdAt', cell: 'dateTime' }),
        expect.objectContaining({ name: 'profile', cell: 'json' }),
      ]),
    )
    expect(model.pagination.enabled).toBe(true)
  })

  test('generates UI-kit neutral form and table metadata without framework wrappers', async () => {
    const cwd = await createTempDir()

    const normalized = normalizeOpenApi(realWorldSchema)
    const resources = detectResources(normalized.operations)
    const plan = await createGenerationPlan({
      config: resolveForgeConfig({
        input: './openapi.yaml',
        resources: {
          users: {
            table: { columns: ['email', 'status', 'verified', 'createdAt', 'profile'], filters: ['email', 'name'] },
            form: { fields: ['email', 'password', 'status', 'verified'] },
          },
        },
      }),
      normalized,
      resources,
      cwd,
    })
    const summary = summarizeFilePlan(plan.files)
    const config = plan.files.find((file) => file.path.endsWith('users.config.ts'))?.content ?? ''
    const i18n = plan.files.find((file) => file.path.endsWith('users.i18n.ts'))?.content ?? ''
    const paths = plan.files.map((file) => file.path)

    expect(summary.protected).toBe(0)
    expect(config).toContain("resource: 'users'")
    expect(config).toContain('fields:')
    expect(config).toContain('columns:')
    expect(config).toContain('filters:')
    expect(config).toContain("component: 'ArchSelect'")
    expect(config).toContain("defaultValue: 'pending'")
    expect(config).toContain('defaultValue: false')
    expect(config).toContain('deprecated: true')
    expect(config).toContain("minLength: 12")
    expect(config).not.toContain("name: 'id'")
    expect(config).toContain("cell: 'badge'")
    expect(config).toContain("cell: 'dateTime'")
    expect(config).toContain("cell: 'boolean'")
    expect(config).toContain("cell: 'json'")
    expect(config).toContain("name: 'email'")
    expect(i18n).toContain("name: 'Name'")
    expect(paths.some((path) => path.endsWith('.vue'))).toBe(false)
  })

  test('metadata generation does not create framework table actions', async () => {
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
    const config = plan.files.find((file) => file.path.endsWith('reports.config.ts'))?.content ?? ''

    expect(config).toContain("resource: 'reports'")
    expect(plan.files.some((file) => file.path.endsWith('.vue'))).toBe(false)
    expect(config).not.toContain('ArchButton')
    expect(config).not.toContain('aria-label="Actions"')
  })
})

async function createTempDir(): Promise<string> {
  const dir = await mkdir(join(tmpdir(), `archora-forge-${crypto.randomUUID()}`), { recursive: true })
  if (!dir) {
    throw new Error('Failed to create temp dir')
  }

  return dir
}
