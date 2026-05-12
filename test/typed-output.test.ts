import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { describe, expect, test } from 'vitest'

import { collectDiagnostics, createGenerationPlan, detectResources, normalizeOpenApi, summarizeFilePlan } from '../packages/core/src/index.js'
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
          { name: 'sort.field', in: 'query', schema: { type: 'string' } },
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
          kind: { type: 'string', const: 'user' },
          nickname: { type: ['string', 'null'] },
          name: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['active', 'blocked'] },
          priority: { type: 'integer', enum: [1, 2] },
          age: { type: 'integer', nullable: true },
          verified: { type: 'boolean' },
          externalKey: { anyOf: [{ type: 'string' }, { type: 'integer' }] },
          tags: { type: 'array', items: { type: 'string' } },
          aliases: { type: 'array', items: { type: ['string', 'null'] } },
          metadata: { type: 'object', additionalProperties: { type: 'string' } },
          attributes: {
            type: 'object',
            properties: {
              source: { type: 'string' },
            },
            additionalProperties: { type: 'string' },
          },
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
      UserFlags: {
        type: 'object',
        additionalProperties: { type: 'boolean' },
      },
      UserLabels: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
          displayName: { type: 'string' },
        },
        additionalProperties: { type: 'string' },
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
    expect(sharedTypes).toContain('export type UserPriority = 1 | 2')
    expect(sharedTypes).toContain('export interface User')
    expect(sharedTypes).toContain('id: string')
    expect(sharedTypes).toContain('email: string')
    expect(sharedTypes).toContain("kind?: 'user'")
    expect(sharedTypes).toContain('nickname?: string | null')
    expect(sharedTypes).toContain('name?: string | null')
    expect(sharedTypes).toContain('priority?: UserPriority')
    expect(sharedTypes).toContain('age?: number | null')
    expect(sharedTypes).toContain('verified?: boolean')
    expect(sharedTypes).toContain('externalKey?: string | number')
    expect(sharedTypes).toContain('tags?: string[]')
    expect(sharedTypes).toContain('aliases?: (string | null)[]')
    expect(sharedTypes).toContain('metadata?: Record<string, string>')
    expect(sharedTypes).toContain('attributes?: {\n    source?: string\n    [key: string]: string | undefined\n  }')
    expect(sharedTypes).toContain('profile?: {\n    city?: string')
    expect(sharedTypes).toContain('export type UserFlags = Record<string, boolean>')
    expect(sharedTypes).toContain('export interface UserLabels')
    expect(sharedTypes).toContain('  [key: string]: string | undefined')
    expect(sharedTypes).not.toContain('password?: string')
    expect(sharedTypes).toContain('export interface CreateUserDto')
    expect(sharedTypes).toContain('password: string')
    expect(types).toContain("import type { CreateUserDto, UpdateUserDto, User } from '../components.types'")
    expect(types).toContain("export type { CreateUserDto, UpdateUserDto, User } from '../components.types'")
    expect(types).not.toMatch(/^export interface User\s*\{/m)
    expect(types).not.toMatch(/^export interface CreateUserDto\s*\{/m)
    expect(types).toContain('export type UserId = string')
    expect(types).toContain('export interface UsersListParams')
    expect(types).toContain("'sort.field'?: string")
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

    expect(client).toContain('export type UsersRequestOptions = Omit<ApiRequestOptions, ')
    expect(client).toContain('listUsers: (params?: UsersListParams, options?: UsersRequestOptions) => Promise<UsersListResponse>')
    expect(client).toContain('getUser: (id: UserId, options?: UsersRequestOptions) => Promise<UserDetailResponse>')
    expect(client).toContain('payload: CreateUserRequest')
    expect(client).toContain(') => Promise<CreateUserResponse>')
    expect(client).toContain('payload: UpdateUserRequest')
    expect(client).toContain(') => Promise<UpdateUserResponse>')
    expect(client).toContain('deleteUser: (id: UserId, options?: UsersRequestOptions) => Promise<void>')
    expect(client).toContain("from '@archora/forge-runtime'")
    expect(client).toContain('type ApiRequestOptions')
    expect(client).toContain('export function configureUsersClient(options: ApiClientOptions): void')
    expect(client).toContain('export function setUsersClient(client: ApiClient): void')
    expect(client).toContain('apiClient.request<UsersListResponse>')
    expect(client).not.toContain('any')
  })

  test('generates nested collection clients with path params for list and create', async () => {
    const normalized = normalizeOpenApi({
      ...typedSchema,
      paths: {
        '/teams/{team-id}/users': {
          parameters: [{ name: 'team-id', in: 'path', required: true, schema: { type: 'string' } }],
          get: typedSchema.paths['/users'].get,
          post: typedSchema.paths['/users'].post,
        },
      },
    })
    const plan = await createGenerationPlan({
      config: resolveForgeConfig({ input: './openapi.yaml' }),
      normalized,
      resources: detectResources(normalized.operations),
      cwd: await createTempDir(),
    })
    const types = readFile(plan, 'users.types.ts')
    const client = readFile(plan, 'users.client.ts')
    const listComposable = readFile(plan, 'useUsersQuery.ts')
    const createComposable = readFile(plan, 'useCreateUserMutation.ts')

    expect(types).toContain("'team-id': string")
    expect(client).toContain('listUsers: (params: UsersListParams, options?: UsersRequestOptions) => Promise<UsersListResponse>')
    expect(client).toContain('createUser: (')
    expect(client).toContain('params: UsersListParams')
    expect(client).toContain('payload: CreateUserRequest')
    expect(client).toContain("`/teams/${encodeURIComponent(String(params['team-id']))}/users`")
    expect(client).toContain("'sort.field': params['sort.field']")
    expect(client).not.toContain("params: params as Record<string, unknown> | undefined")
    expect(listComposable).toContain('useUsersQuery(params: UsersListParams)')
    expect(createComposable).toContain('mutate: (input: {')
    expect(createComposable).toContain('params: UsersListParams')
    expect(createComposable).toContain('payload: CreateUserRequest')
    expect(createComposable).toContain('usersClient.createUser(input.params, input.payload)')
  })

  test('generates OpenAPI form query array serialization for explode false params', async () => {
    const normalized = normalizeOpenApi({
      ...typedSchema,
      paths: {
        '/users': {
          get: {
            ...typedSchema.paths['/users'].get,
            parameters: [
              { name: 'tags', in: 'query', style: 'form', explode: false, schema: { type: 'array', items: { type: 'string' } } },
            ],
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
    const client = readFile(plan, 'users.client.ts')
    const types = readFile(plan, 'users.types.ts')

    expect(types).toContain('tags?: string[]')
    expect(client).toContain('queryParam')
    expect(client).toContain("from '@archora/forge-runtime'")
    expect(client).toContain("params: { tags: queryParam(params?.tags, { style: 'form', explode: false }) }")
  })

  test('generates nested detail clients with object identity params', async () => {
    const normalized = normalizeOpenApi({
      ...typedSchema,
      paths: {
        '/teams/{teamId}/users/{userId}': {
          parameters: [{ name: 'teamId', in: 'path', required: true, schema: { type: 'string' } }],
          get: {
            ...typedSchema.paths['/users/{id}'].get,
            parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
          },
          patch: {
            ...typedSchema.paths['/users/{id}'].patch,
            parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
          },
          delete: {
            ...typedSchema.paths['/users/{id}'].delete,
            parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
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
    const types = readFile(plan, 'users.types.ts')
    const client = readFile(plan, 'users.client.ts')
    const queryKeys = readFile(plan, 'users.query-keys.ts')
    const detailComposable = readFile(plan, 'useUserQuery.ts')
    const updateComposable = readFile(plan, 'useUpdateUserMutation.ts')
    const deleteComposable = readFile(plan, 'useDeleteUserMutation.ts')

    expect(types).toContain('export interface UserId')
    expect(types).toContain('teamId: string')
    expect(types).toContain('userId: string')
    expect(client).toContain('getUser: (params: UserId, options?: UsersRequestOptions) => Promise<UserDetailResponse>')
    expect(client).toContain('updateUser: (')
    expect(client).toContain('params: UserId')
    expect(client).toContain('payload: UpdateUserRequest')
    expect(client).toContain('deleteUser: (params: UserId, options?: UsersRequestOptions) => Promise<void>')
    expect(client).toContain('`/teams/${encodeURIComponent(String(params.teamId))}/users/${encodeURIComponent(String(params.userId))}`')
    expect(queryKeys).toContain('detail: (id: UserId)')
    expect(detailComposable).toContain('useUserQuery(id: UserId)')
    expect(updateComposable).toContain('mutate: (input: { id: UserId; payload: UpdateUserRequest })')
    expect(deleteComposable).toContain('invalidate: (id: UserId) => ReturnType<typeof usersQueryKeys.list>')
    expect(deleteComposable).toContain('invalidate: (id) => usersQueryKeys.list({ teamId: id.teamId })')
  })

  test('generates typed promise operation helpers and query keys', async () => {
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

  test('does not emit missing CRUD helper stubs for partial resource operations', async () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Person Registry API', version: '1.0.0' },
      paths: {
        '/recruits/{id}/details': {
          put: {
            operationId: 'updateRecruitDetails',
            tags: ['PersonRegistry'],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/RecruitDetails' },
                },
              },
            },
            responses: {
              '200': {
                description: 'Updated',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/RecruitDetails' },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          RecruitDetails: {
            type: 'object',
            required: ['status'],
            properties: {
              status: { type: 'string' },
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
    const paths = plan.files.map((file) => file.path)
    const client = readFile(plan, 'recruitsDetails.client.ts')
    const operationComposable = readFile(plan, 'useUpdateRecruitDetailsMutation.ts')
    const index = readFile(plan, 'src/features/recruitsDetails/api/index.ts')

    expect(paths).not.toContain('src/features/details/api/useDetailQuery.ts')
    expect(paths).not.toContain('src/features/details/api/useDetailsQuery.ts')
    expect(paths).not.toContain('src/features/details/api/useCreateDetailMutation.ts')
    expect(paths).not.toContain('src/features/details/api/useUpdateDetailMutation.ts')
    expect(paths).not.toContain('src/features/details/api/useDeleteDetailMutation.ts')
    expect(client).toContain('updateRecruitDetails:')
    expect(operationComposable).toContain('export function useUpdateRecruitDetailsMutation')
    expect(operationComposable).toContain('recruitsDetailsClient.updateRecruitDetails(input.payload, input.params)')
    expect(index).toContain("export * from './useUpdateRecruitDetailsMutation'")
    expect(index).not.toContain('useDetailQuery')
    expect(plan.files.map((file) => file.content).join('\n')).not.toContain('missing OpenAPI operation')
  })

  test('generates action helpers with explicit path params for subresource actions', async () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'CRM Actions API', version: '1.0.0' },
      paths: {
        '/contacts/{contactId}/archive': {
          post: {
            operationId: 'archiveContact',
            tags: ['Contacts'],
            summary: 'Archive contact',
            parameters: [{ $ref: '#/components/parameters/ContactId' }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ArchiveContactRequest' },
                },
              },
            },
            responses: {
              '200': {
                description: 'Archived',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Contact' },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        parameters: {
          ContactId: { name: 'contactId', in: 'path', required: true, schema: { type: 'string' } },
        },
        schemas: {
          Contact: {
            type: 'object',
            required: ['id'],
            properties: { id: { type: 'string' } },
          },
          ArchiveContactRequest: {
            type: 'object',
            required: ['reason'],
            properties: { reason: { type: 'string' } },
          },
        },
      },
    })
    const resources = detectResources(normalized.operations)
    const plan = await createGenerationPlan({
      config: resolveForgeConfig({ input: './openapi.yaml' }),
      normalized,
      resources,
      cwd: await createTempDir(),
    })

    const types = readFile(plan, 'contactsArchive.types.ts')
    const client = readFile(plan, 'contactsArchive.client.ts')
    const operationComposable = readFile(plan, 'useArchiveContactMutation.ts')

    expect(resources[0]).toMatchObject({ name: 'contactsArchive', kind: 'action-operation', operations: {} })
    expect(types).toContain('export interface ArchiveContactOperationParams')
    expect(types).toContain('contactId: string')
    expect(types).toContain('export type ArchiveContactOperationRequest = ArchiveContactRequest')
    expect(types).toContain('export type ArchiveContactOperationResponse = Contact')
    expect(client).toContain('archiveContact: (')
    expect(client).toContain('payload: ArchiveContactOperationRequest')
    expect(client).toContain('params: ArchiveContactOperationParams')
    expect(client).toContain('options?: ContactsArchiveRequestOptions')
    expect(client).toContain(') => Promise<ArchiveContactOperationResponse>')
    expect(client).toContain("`/contacts/${encodeURIComponent(String(params.contactId))}/archive`")
    expect(client).not.toContain("'/contacts/{contactId}/archive'")
    expect(operationComposable).toContain('mutate: (input: ArchiveContactOperationInput) => Promise<ArchiveContactOperationResponse>')
    expect(operationComposable).toContain('contactsArchiveClient.archiveContact(input.payload, input.params)')
  })

  test('uses configured resource entity names in generated API helpers', async () => {
    const normalized = normalizeOpenApi(typedSchema)
    const plan = await createGenerationPlan({
      config: resolveForgeConfig({
        input: './openapi.yaml',
        resources: {
          users: { entity: 'Company' },
        },
      }),
      normalized,
      resources: detectResources(normalized.operations),
      cwd: await createTempDir(),
    })

    const client = readFile(plan, 'users.client.ts')
    const listComposable = readFile(plan, 'useCompaniesQuery.ts')
    const createComposable = readFile(plan, 'useCreateCompanyMutation.ts')
    const i18n = readFile(plan, 'users.i18n.ts')

    expect(client).toContain('configureCompaniesClient')
    expect(client).toContain('setCompaniesClient')
    expect(listComposable).toContain('export function useCompaniesQuery')
    expect(createComposable).toContain('export function useCreateCompanyMutation')
    expect(i18n).toContain("title: 'Companies'")
  })

  test('types create mutations from operation request and response metadata', async () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Search API', version: '1.0.0' },
      paths: {
        '/search/{tenantId}': {
          post: {
            operationId: 'search.create',
            tags: ['Search'],
            parameters: [
              { name: 'tenantId', in: 'path', required: true, schema: { type: 'string' } },
              { name: 'X-Tenant-ID', in: 'header', required: true, schema: { type: 'string' } },
              { name: 'X-Trace-Sample', in: 'header', schema: { type: 'integer' } },
              { name: 'locale', in: 'query', schema: { type: 'string' } },
            ],
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
    const diagnosticCodes = collectDiagnostics(normalized).map((diagnostic) => diagnostic.code)

    expect(client).toContain('configureSearchesClient')
    expect(client).toContain('setSearchesClient')
    expect(client).not.toContain('configureSearchsClient')
    expect(types).toContain('export type SearchCreateOperationRequest = SearchRequest')
    expect(types).toContain('export interface SearchCreateOperationParams')
    expect(types).toContain('tenantId: string')
    expect(types).toContain("'X-Tenant-ID': string")
    expect(types).toContain("'X-Trace-Sample'?: number")
    expect(types).toContain('locale?: string')
    expect(types).toContain('export type SearchCreateOperationResponse = SearchResponse')
    expect(client).toContain('payload: SearchCreateOperationRequest')
    expect(client).toContain('params: SearchCreateOperationParams')
    expect(client).toContain('options?: SearchRequestOptions')
    expect(client).toContain(') => Promise<SearchCreateOperationResponse>')
    expect(client).toContain('`/search/${encodeURIComponent(String(params.tenantId))}`')
    expect(client).toContain('params: { locale: params.locale }')
    expect(client).toContain('headers: createOperationHeaders(options?.headers, {')
    expect(client).toContain("'X-Tenant-ID': params['X-Tenant-ID']")
    expect(client).toContain("'X-Trace-Sample': params['X-Trace-Sample']")
    expect(client).toContain('function createOperationHeaders(')
    expect(client).toContain('if (value !== undefined && value !== null) headers[key] = String(value)')
    expect(client).not.toContain('params: params as Record<string, unknown>')
    expect(diagnosticCodes).not.toContain('unsupported-header-parameter')
    expect(searchComposable).toContain('mutate: (input: SearchCreateOperationInput) => Promise<SearchCreateOperationResponse>')
    expect(searchComposable).toContain('searchClient.searchCreate(input.payload, input.params)')
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
    expect(client).toContain('id: EmployeeId')
    expect(client).toContain('options?: EmployeesRequestOptions')
    expect(client).toContain(') => Promise<EmployeeDetailResponse>')
    expect(detailComposable).toContain('Promise<EmployeeDetailResponse>')
    expect(detailComposable).not.toContain('Promise<Employee>')
  })

  test('generates UI-kit neutral resource metadata without framework runtime artifacts', async () => {
    const cwd = await createTempDir()
    const plan = await createTypedPlan(cwd)
    const summary = summarizeFilePlan(plan.files)
    const config = readFile(plan, 'users.config.ts')
    const paths = plan.files.map((file) => file.path)

    expect(summary.protected).toBe(0)
    expect(config).toContain("resource: 'users'")
    expect(config).toContain('fields:')
    expect(config).toContain('columns:')
    expect(config).toContain("input: 'email'")
    expect(config).toContain("cell: 'badge'")
    expect(paths.some((path) => path.endsWith('.vue'))).toBe(false)
    expect(paths).not.toContain('src/shared/ui/archora-ui.ts')
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
