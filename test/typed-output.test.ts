import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { describe, expect, test } from 'vitest'

import { createGenerationPlan, detectResources, normalizeOpenApi, summarizeFilePlan } from '../packages/core/src/index.js'
import { resolveForgeConfig } from '../packages/config/src/index.js'

const typedSchema = {
  openapi: '3.0.3',
  info: { title: 'Typed API', version: '1.0.0' },
  paths: {
    '/users': {
      get: {
        operationId: 'listUsers',
        tags: ['Users'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'blocked'] } },
        ],
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
    '/users/{id}': {
      get: {
        operationId: 'getUser',
        tags: ['Users'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
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
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
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
          email: { type: 'string', format: 'email' },
          name: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['active', 'blocked'] },
          age: { type: 'integer', nullable: true },
          verified: { type: 'boolean' },
          tags: { type: 'array', items: { type: 'string' } },
          profile: {
            type: 'object',
            properties: {
              city: { type: 'string' },
            },
          },
          password: { type: 'string', writeOnly: true },
        },
      },
      CreateUserDto: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', writeOnly: true },
          status: { type: 'string', enum: ['active', 'blocked'] },
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

describe('Type-safe generated output', () => {
  test('generates schema-derived TypeScript models and operation aliases', async () => {
    const plan = await createTypedPlan()
    const sharedTypes = readFile(plan, 'components.types.ts')
    const types = readFile(plan, 'users.types.ts')

    expect(sharedTypes).toContain("export type UserStatus = 'active' | 'blocked'")
    expect(sharedTypes).toContain('export interface User')
    expect(sharedTypes).toContain('id: string')
    expect(sharedTypes).toContain('email: string')
    expect(sharedTypes).toContain('name?: string | null')
    expect(sharedTypes).toContain('age?: number | null')
    expect(sharedTypes).toContain('verified?: boolean')
    expect(sharedTypes).toContain('tags?: string[]')
    expect(sharedTypes).toContain('profile?: {\n    city?: string')
    expect(sharedTypes).not.toContain('password?: string')
    expect(sharedTypes).toContain('export interface CreateUserDto')
    expect(sharedTypes).toContain('password: string')
    expect(types).toContain("import type { CreateUserDto, UpdateUserDto, User } from '../components.types'")
    expect(types).toContain("export type { CreateUserDto, UpdateUserDto, User } from '../components.types'")
    expect(types).not.toMatch(/^export interface User\s*\{/m)
    expect(types).not.toMatch(/^export interface CreateUserDto\s*\{/m)
    expect(types).toContain('export type UserId = string')
    expect(types).toContain('export interface UsersListParams')
    expect(types).toContain("status?: 'active' | 'blocked'")
    expect(types).toContain('export interface UsersListResponse')
    expect(types).toContain('items: User[]')
    expect(types).toContain('export type CreateUserRequest = CreateUserDto')
    expect(types).toContain('export type UpdateUserRequest = UpdateUserDto')
  })

  test('generates shared component schemas once for multiple resources', async () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Shared Schemas API', version: '1.0.0' },
      paths: {
        '/users': {
          get: {
            operationId: 'listUsers',
            tags: ['Users'],
            responses: {
              '200': {
                description: 'Users',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/UserListResponse' },
                  },
                },
              },
            },
          },
        },
        '/orders': {
          get: {
            operationId: 'listOrders',
            tags: ['Orders'],
            responses: {
              '200': {
                description: 'Orders',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/OrderListResponse' },
                  },
                },
              },
            },
          },
          post: {
            operationId: 'createOrder',
            tags: ['Orders'],
            requestBody: {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CreateOrderDto' },
                },
              },
            },
            responses: {
              '201': {
                description: 'Order',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Order' },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          User: {
            type: 'object',
            required: ['id'],
            properties: { id: { type: 'string' }, email: { type: 'string' } },
          },
          Order: {
            type: 'object',
            required: ['id', 'user'],
            properties: {
              id: { type: 'string' },
              user: { $ref: '#/components/schemas/User' },
            },
          },
          UserListResponse: {
            type: 'object',
            required: ['items'],
            properties: { items: { type: 'array', items: { $ref: '#/components/schemas/User' } } },
          },
          OrderListResponse: {
            type: 'object',
            required: ['items'],
            properties: { items: { type: 'array', items: { $ref: '#/components/schemas/Order' } } },
          },
          CreateOrderDto: {
            type: 'object',
            required: ['userId'],
            properties: { userId: { type: 'string' } },
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

    const sharedTypes = readFile(plan, 'components.types.ts')
    const usersTypes = readFile(plan, 'users.types.ts')
    const ordersTypes = readFile(plan, 'orders.types.ts')

    expect(sharedTypes.match(/export interface User\b/g)).toHaveLength(1)
    expect(sharedTypes.match(/export interface Order\b/g)).toHaveLength(1)
    expect(sharedTypes).toContain('export interface UserListResponse')
    expect(sharedTypes).toContain('export interface OrderListResponse')
    expect(usersTypes).toContain("import type { User, UserListResponse } from '../components.types'")
    expect(ordersTypes).toContain("import type { CreateOrderDto, Order, OrderListResponse } from '../components.types'")
    expect(usersTypes).not.toContain('export interface User')
    expect(ordersTypes).not.toContain('export interface Order')
    expect(ordersTypes).toContain('export type CreateOrderRequest = CreateOrderDto')
    expect(ordersTypes).toContain('export type CreateOrderResponse = Order')
  })

  test('generates typed API client signatures', async () => {
    const plan = await createTypedPlan()
    const client = readFile(plan, 'users.client.ts')

    expect(client).toContain('listUsers: (params?: UsersListParams) => Promise<UsersListResponse>')
    expect(client).toContain('getUser: (id: UserId) => Promise<UserDetailResponse>')
    expect(client).toContain('createUser: (payload: CreateUserRequest) => Promise<CreateUserResponse>')
    expect(client).toContain('updateUser: (id: UserId, payload: UpdateUserRequest) => Promise<UpdateUserResponse>')
    expect(client).toContain('deleteUser: (id: UserId) => Promise<void>')
    expect(client).toContain('apiClient.request<UsersListResponse>')
    expect(client).not.toContain('any')
  })

  test('generates typed Vue composables and query keys', async () => {
    const plan = await createTypedPlan()
    const listComposable = readFile(plan, 'useUsersQuery.ts')
    const createComposable = readFile(plan, 'useCreateUserMutation.ts')
    const queryKeys = readFile(plan, 'users.query-keys.ts')

    expect(listComposable).toContain('params?: UsersListParams')
    expect(listComposable).toContain('Promise<UsersListResponse>')
    expect(createComposable).toContain('mutate: (payload: CreateUserRequest) => usersClient.createUser(payload)')
    expect(createComposable).toContain("invalidate: () => usersQueryKeys.list()")
    expect(queryKeys).toContain('list: (params?: UsersListParams)')
    expect(queryKeys).toContain('detail: (id: UserId)')
  })

  test('types create mutations from operation request and response metadata', async () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Search API', version: '1.0.0' },
      paths: {
        '/search': {
          post: {
            operationId: 'search.create',
            tags: ['Search'],
            requestBody: {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SearchRequest' },
                },
              },
            },
            responses: {
              '200': {
                description: 'Search result',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/SearchResponse' },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          SearchRequest: {
            type: 'object',
            required: ['query'],
            properties: { query: { type: 'string' } },
          },
          SearchResponse: {
            type: 'object',
            required: ['items'],
            properties: { items: { type: 'array', items: { type: 'string' } } },
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

    const types = readFile(plan, 'search.types.ts')
    const client = readFile(plan, 'search.client.ts')
    const searchComposable = readFile(plan, 'useSearchCreateMutation.ts')

    expect(types).toContain('export type SearchCreateOperationRequest = SearchRequest')
    expect(types).toContain('export type SearchCreateOperationResponse = SearchResponse')
    expect(client).toContain('searchCreate: (payload: SearchCreateOperationRequest) => Promise<SearchCreateOperationResponse>')
    expect(searchComposable).toContain('mutate: (input: SearchCreateOperationInput) => Promise<SearchCreateOperationResponse>')
    expect(searchComposable).toContain('searchClient.searchCreate(input)')
    expect(searchComposable).not.toContain('Promise<Search>')
  })

  test('types detail queries from operation response metadata when no canonical entity exists', async () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Employee API', version: '1.0.0' },
      paths: {
        '/employees/{id}': {
          get: {
            operationId: 'get-employee',
            tags: ['Employees'],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
              '200': {
                description: 'Employee organization info',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/OrganizationInfoResponse_V1' },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          OrganizationInfoResponse_V1: {
            type: 'object',
            required: ['name'],
            properties: { name: { type: 'string' } },
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

    const types = readFile(plan, 'employees.types.ts')
    const client = readFile(plan, 'employees.client.ts')
    const detailComposable = readFile(plan, 'useEmployeeQuery.ts')

    expect(types).toContain('export type EmployeeDetailResponse = OrganizationInfoResponse_V1')
    expect(client).toContain('getEmployee: (id: EmployeeId) => Promise<EmployeeDetailResponse>')
    expect(detailComposable).toContain('Promise<EmployeeDetailResponse>')
    expect(detailComposable).not.toContain('Promise<Employee>')
  })

  test('generates Archora UI fallback runtime and imports it from generated components', async () => {
    const cwd = await createTempDir()
    await mkdir(join(cwd, 'src/features/users/ui'), { recursive: true })
    await writeFile(join(cwd, 'src/features/users/ui/UsersTable.vue'), '<template>Custom</template>\n', 'utf8')
    const plan = await createTypedPlan(cwd)
    const summary = summarizeFilePlan(plan.files)
    const fallback = readFile(plan, 'archora-ui.ts')
    const form = readFile(plan, 'UserForm.generated.vue')
    const table = readFile(plan, 'UsersTable.generated.vue')

    expect(summary.protected).toBe(1)
    expect(fallback).toContain('export const ArchInput')
    expect(fallback).toContain('export const ArchDataTable')
    expect(form).toContain("from '../../../shared/ui/archora-ui'")
    expect(form).toContain(':is="resolveFieldComponent(field)"')
    expect(table).toContain("from '../../../shared/ui/archora-ui'")
    expect(table).toContain('<ArchDataTable')
  })
})

async function createTypedPlan(cwd?: string) {
  const normalized = normalizeOpenApi(typedSchema)
  return createGenerationPlan({
    config: resolveForgeConfig({ input: './openapi.yaml' }),
    normalized,
    resources: detectResources(normalized.operations),
    cwd: cwd ?? (await createTempDir()),
  })
}

function readFile(plan: Awaited<ReturnType<typeof createTypedPlan>>, suffix: string): string {
  return plan.files.find((file) => file.path.endsWith(suffix))?.content ?? ''
}

async function createTempDir(): Promise<string> {
  const dir = await mkdir(join(tmpdir(), `archora-forge-${crypto.randomUUID()}`), { recursive: true })
  if (!dir) {
    throw new Error('Failed to create temp dir')
  }

  return dir
}
