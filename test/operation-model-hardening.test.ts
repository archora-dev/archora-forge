import { describe, expect, test } from 'vitest'
import { join } from 'node:path'

import {
  collectDiagnostics,
  createGenerationPlan,
  detectResources,
  normalizeOpenApi,
  parseOpenApi,
} from '../packages/core/src/index.js'
import { resolveForgeConfig } from '../packages/config/src/index.js'

describe('Operation model hardening fixtures', () => {
  test('keeps resources distinct when unrelated endpoints repeat the last path segment', () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Repeated last segment', version: '1.0.0' },
      paths: {
        '/registered/main': { get: operation('getRegisteredMain') },
        '/appeal/main': { get: operation('getAppealMain') },
        '/needRegistration/main': { get: operation('getNeedRegistrationMain') },
      },
    })

    const resources = detectResources(normalized.operations)

    expect(operationIds(resources)).toEqual(['getAppealMain', 'getNeedRegistrationMain', 'getRegisteredMain'])
    expect(resources.map((resource) => resource.name).sort()).toEqual(['appealMain', 'needRegistrationMain', 'registeredMain'])
    expect(resources.every((resource) => resource.operationsList.length === 1)).toBe(true)
  })

  test('classifies POST search endpoints as search operations, not CRUD create slots', () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Search operations', version: '1.0.0' },
      paths: {
        '/search/main': { post: operation('searchMain') },
        '/users/search': { post: operation('searchUsers') },
      },
    })

    const resources = detectResources(normalized.operations)

    expect(normalized.operations.map((operation) => [operation.id, operation.operationKind])).toEqual([
      ['searchMain', 'search-resource'],
      ['searchUsers', 'search-resource'],
    ])
    expect(resources.map((resource) => resource.kind)).toEqual(['search-resource', 'search-resource'])
    expect(resources.every((resource) => resource.operations.create === undefined)).toBe(true)
  })

  test('classifies GET search endpoints as search operations without changing normal collection lists', () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'GET Search operations', version: '1.0.0' },
      paths: {
        '/search': { get: operation('searchWorkspace', { tags: ['Search'], summary: 'Search workspace' }) },
        '/contacts/search': { get: operation('findContacts', { tags: ['Contacts'], summary: 'Find contacts' }) },
        '/users': { get: operation('listUsers', { tags: ['Users'], summary: 'List users' }) },
      },
    })
    const resources = detectResources(normalized.operations)

    expect(normalized.operations.map((operation) => [operation.id, operation.operationKind])).toEqual([
      ['searchWorkspace', 'search-resource'],
      ['findContacts', 'search-resource'],
      ['listUsers', 'crud-resource'],
    ])
    expect(resources.find((resource) => resource.name === 'search')?.kind).toBe('search-resource')
    expect(resources.find((resource) => resource.name === 'contactsSearch')?.kind).toBe('search-resource')
    expect(resources.find((resource) => resource.name === 'users')?.operations.list?.id).toBe('listUsers')
  })

  test('generates honest action panels for action operations', async () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Action operations', version: '1.0.0' },
      paths: {
        '/orders/{id}/approve': { post: operation('approveOrder', { pathParam: 'id' }) },
        '/users/{id}/block': { post: operation('blockUser', { pathParam: 'id' }) },
        '/tasks/{taskId}/submitForm': {
          post: operation('submitTaskForm', {
            pathParam: 'taskId',
            requestSchema: objectSchema({ approved: { type: 'boolean' } }),
            responseSchema: null,
          }),
        },
      },
    })
    const resources = detectResources(normalized.operations)
    const plan = await planFor(normalized)
    const content = plan.files.map((file) => file.content).join('\n')

    expect(normalized.operations.map((operation) => [operation.id, operation.operationKind])).toEqual([
      ['approveOrder', 'action-operation'],
      ['blockUser', 'action-operation'],
      ['submitTaskForm', 'action-operation'],
    ])
    expect(resources.every((resource) => resource.kind === 'action-operation')).toBe(true)
    expect(resources.every((resource) => resource.operations.create === undefined)).toBe(true)
    expect(content).toContain("resource: 'ordersApprove'")
    expect(content).toContain("resource: 'tasksSubmitForm'")
    expect(content).toContain("resource: 'usersBlock'")
    expect(plan.files.some((file) => file.path.endsWith('.vue'))).toBe(false)
    expect(content).not.toContain('Create ordersApprove')
    expect(content).not.toContain('Create usersBlock')
  })

  test('classifies archive subresource writes as action operations, not create-only CRUD resources', () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Archive actions', version: '1.0.0' },
      paths: {
        '/contacts/{contactId}/archive': {
          post: operation('archiveContact', {
            tags: ['Contacts'],
            pathParam: 'contactId',
            summary: 'Archive contact',
            requestSchema: objectSchema({ reason: { type: 'string' } }),
          }),
        },
      },
    })
    const resources = detectResources(normalized.operations)

    expect(normalized.operations.map((operation) => [operation.id, operation.operationKind])).toEqual([
      ['archiveContact', 'action-operation'],
    ])
    expect(resources).toHaveLength(1)
    expect(resources[0]).toMatchObject({
      name: 'contactsArchive',
      kind: 'action-operation',
      isCrudCandidate: false,
      operations: {},
    })
  })

  test('public CRM demo detects search and archive action resources honestly', async () => {
    const normalized = normalizeOpenApi(await parseOpenApi(join(process.cwd(), 'examples/public-crm/openapi.yaml')))
    const resources = detectResources(normalized.operations)

    expect(normalized.operations.find((operation) => operation.id === 'searchWorkspace')?.operationKind).toBe('search-resource')
    expect(normalized.operations.find((operation) => operation.id === 'archiveContact')?.operationKind).toBe('action-operation')
    expect(resources.find((resource) => resource.name === 'search')).toMatchObject({
      kind: 'search-resource',
      operations: {},
    })
    expect(resources.find((resource) => resource.name === 'contactsArchive')).toMatchObject({
      kind: 'action-operation',
      operations: {},
    })
    expect(resources.some((resource) => resource.name === 'archive')).toBe(false)
  })

  test('classifies read-only subresource endpoints without turning them into CRUD detail helpers', () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Read-only operations', version: '1.0.0' },
      paths: {
        '/users/{id}/status': { get: operation('getUserStatus', { pathParam: 'id' }) },
        '/teams/{team-id}/users': { get: operation('listTeamUsers', { pathParam: 'team-id' }) },
      },
    })
    const resources = detectResources(normalized.operations)

    expect(normalized.operations.map((operation) => [operation.id, operation.operationKind])).toEqual([
      ['getUserStatus', 'read-only-resource'],
      ['listTeamUsers', 'crud-resource'],
    ])
    expect(resources.find((resource) => resource.name === 'usersStatus')?.operations.detail).toBeUndefined()
    expect(resources.find((resource) => resource.name === 'users')?.operations.list?.id).toBe('listTeamUsers')
  })

  test('preserves file operations without rendering fake CRUD table actions', async () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'File operations', version: '1.0.0' },
      paths: {
        '/files/{id}/download': {
          get: {
            operationId: 'downloadFile',
            tags: ['Files'],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
              '200': {
                description: 'File bytes',
                content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } },
              },
            },
          },
        },
        '/files/upload': {
          post: {
            operationId: 'uploadFile',
            tags: ['Files'],
            requestBody: {
              content: {
                'multipart/form-data': { schema: objectSchema({ file: { type: 'string', format: 'binary' } }) },
              },
            },
            responses: { '204': { description: 'Uploaded' } },
          },
        },
      },
    })
    const resources = detectResources(normalized.operations)
    const plan = await planFor(normalized)
    const content = plan.files.map((file) => file.content).join('\n')
    expect(normalized.operations.map((operation) => [operation.id, operation.operationKind])).toEqual([
      ['downloadFile', 'file-operation'],
      ['uploadFile', 'file-operation'],
    ])
    expect(operationIds(resources)).toEqual(['downloadFile', 'uploadFile'])
    expect(resources.every((resource) => resource.kind === 'file-operation')).toBe(true)
    expect(resources.every((resource) => Object.keys(resource.operations).length === 0)).toBe(true)
    expect(content).toContain("resource: 'filesDownload'")
    expect(content).toContain("resource: 'filesUpload'")
    expect(plan.files.some((file) => file.path.endsWith('.vue'))).toBe(false)
    expect(content).not.toContain('<ArchDataTable')
  })

  test('treats charset and JSON suffix content types as JSON-compatible metadata', () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'JSON compatible content', version: '1.0.0' },
      paths: {
        '/charset': {
          post: operation('postCharset', {
            requestContentType: 'application/json;charset=utf-8',
            responseContentType: 'application/json;charset=utf-8',
          }),
        },
        '/problem': {
          post: operation('postProblem', {
            requestContentType: 'application/problem+json',
            responseContentType: 'application/problem+json',
          }),
        },
        '/vendor': {
          post: operation('postVendor', {
            requestContentType: 'application/vnd.api+json',
            responseContentType: 'application/vnd.api+json',
          }),
        },
      },
    })

    expect(normalized.operations.map((operation) => [operation.id, operation.isJsonRequest, operation.isJsonResponse])).toEqual([
      ['postCharset', true, true],
      ['postProblem', true, true],
      ['postVendor', true, true],
    ])
    expect(normalized.operations.map((operation) => operation.requestContentTypes)).toEqual([
      ['application/json'],
      ['application/problem+json'],
      ['application/vnd.api+json'],
    ])
  })

  test('types text and binary operations without treating them as unsupported JSON gaps', async () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Non JSON operations', version: '1.0.0' },
      paths: {
        '/messages/plain': {
          post: operation('sendPlainMessage', {
            requestContentType: 'text/plain',
            requestSchema: { type: 'string' },
            responseContentType: 'text/plain',
            responseSchema: { type: 'string' },
          }),
        },
        '/files/raw': {
          post: operation('sendRawFile', {
            requestContentType: 'application/octet-stream',
            requestSchema: { type: 'string', format: 'binary' },
            responseContentType: 'application/octet-stream',
            responseSchema: { type: 'string', format: 'binary' },
          }),
        },
        '/files/wildcard': {
          get: operation('downloadWildcardFile', {
            requestSchema: null,
            responseContentType: '*/*',
            responseSchema: { type: 'string', format: 'binary' },
          }),
        },
        '/documents/wildcard': {
          get: operation('getWildcardDocument', {
            requestSchema: null,
            responseContentType: '*/*',
            responseSchema: { type: 'object' },
          }),
        },
        '/forms/reset': {
          post: operation('resetPassword', {
            requestContentType: 'application/x-www-form-urlencoded',
            requestSchema: objectSchema({ username: { type: 'string' } }),
            responseContentType: 'application/text',
            responseSchema: { type: 'string' },
          }),
        },
      },
    })
    const resources = detectResources(normalized.operations)
    const diagnostics = collectDiagnostics(normalized)
    const plan = await planFor(normalized)
    const generated = plan.files.map((file) => file.content).join('\n')

    expect(normalized.operations.map((operation) => [operation.id, operation.isJsonRequest, operation.isJsonResponse])).toEqual([
      ['sendPlainMessage', false, false],
      ['sendRawFile', false, false],
      ['downloadWildcardFile', false, false],
      ['getWildcardDocument', false, false],
      ['resetPassword', false, false],
    ])
    expect(operationIds(resources)).toEqual(['downloadWildcardFile', 'getWildcardDocument', 'resetPassword', 'sendPlainMessage', 'sendRawFile'])
    expect(resources.find((resource) => resource.name === 'filesRaw')?.kind).toBe('file-operation')
    expect(normalized.operations.find((operation) => operation.id === 'sendPlainMessage')?.requestBodySchema).toMatchObject({ type: 'string' })
    expect(normalized.operations.find((operation) => operation.id === 'sendPlainMessage')?.responseSchema).toMatchObject({ type: 'string' })
    expect(normalized.operations.find((operation) => operation.id === 'resetPassword')?.requestBodySchema).toMatchObject({ type: 'object' })
    expect(normalized.operations.find((operation) => operation.id === 'downloadWildcardFile')?.responseSchema).toMatchObject({ type: 'string', format: 'binary' })
    expect(normalized.operations.find((operation) => operation.id === 'getWildcardDocument')?.responseSchema).toMatchObject({ type: 'object' })
    expect(generated).toContain('export type CreateResetRequest = URLSearchParams')
    expect(generated).toContain('export type CreateResetResponse = string')
    expect(generated).toContain('export type WildcardsListResponse = Blob')
    expect(diagnostics).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'unsupported-content-type', location: 'POST /messages/plain' })]),
    )
    expect(diagnostics).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'unsupported-content-type', location: 'GET /documents/wildcard' })]),
    )
    expect(diagnostics).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'unsupported-content-type', location: 'POST /files/raw' })]),
    )
  })

  test('treats Authorization header parameters as runtime auth configuration instead of unsupported headers', () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Authorization header parameter', version: '1.0.0' },
      paths: {
        '/secure/users': {
          get: {
            operationId: 'listSecureUsers',
            tags: ['Users'],
            parameters: [{ name: 'Authorization', in: 'header', required: true, schema: { type: 'string' } }],
            responses: {
              '200': {
                description: 'Users',
                content: {
                  'application/json': {
                    schema: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' } } } },
                  },
                },
              },
            },
          },
        },
      },
    })

    expect(collectDiagnostics(normalized).map((diagnostic) => diagnostic.code)).not.toContain('unsupported-header-parameter')
  })

  test('treats runtime-supported bearer, oauth2 and header apiKey security schemes as supported', () => {
    const supported = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Supported security schemes', version: '1.0.0' },
      paths: { '/secure': { get: operation('getSecure') } },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer' },
          oauthAuth: {
            type: 'oauth2',
            flows: {
              authorizationCode: {
                authorizationUrl: 'https://auth.test/authorize',
                tokenUrl: 'https://auth.test/token',
                scopes: {},
              },
            },
          },
          apiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' },
        },
      },
    })
    const unsupported = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Unsupported security schemes', version: '1.0.0' },
      paths: { '/secure': { get: operation('getSecure') } },
      components: {
        securitySchemes: {
          cookieKey: { type: 'apiKey', in: 'cookie', name: 'session' },
        },
      },
    })

    expect(collectDiagnostics(supported).map((diagnostic) => diagnostic.code)).not.toContain('unsupported-security-schemes')
    expect(collectDiagnostics(unsupported).map((diagnostic) => diagnostic.code)).toContain('unsupported-security-schemes')
  })

  test('supports freeform object unions and annotation-only allOf wrappers', async () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Composition edge cases', version: '1.0.0' },
      paths: { '/documents': { get: operation('listDocuments') } },
      components: {
        schemas: {
          Alignment: { type: 'string', enum: ['LEFT', 'RIGHT'] },
          DocumentValue: {
            type: 'object',
            properties: {
              value: {
                oneOf: [{ type: 'string' }, { type: 'integer' }, { type: 'object' }],
                nullable: true,
              },
              align: {
                allOf: [{ $ref: '#/components/schemas/Alignment' }, { default: 'RIGHT' }],
              },
            },
          },
        },
      },
    })
    const diagnostics = collectDiagnostics(normalized).map((diagnostic) => diagnostic.code)
    const plan = await planFor(normalized)
    const generated = plan.files.map((file) => file.content).join('\n')

    expect(diagnostics).not.toContain('unsupported-oneof')
    expect(diagnostics).not.toContain('unsupported-allof')
    expect(generated).toContain('value?: string | number | Record<string, unknown> | null')
    expect(generated).toContain('align?: Alignment')
  })

  test('preserves every operation id in a mixed synthetic contract or emits an explicit diagnostic', () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Mixed operation invariant', version: '1.0.0' },
      paths: {
        '/registered/main': { get: operation('getRegisteredMain') },
        '/appeal/main': { get: operation('getAppealMain') },
        '/search/main': { post: operation('searchMain') },
        '/users': { get: operation('listUsers'), post: operation('createUser') },
        '/users/{id}': { get: operation('getUser', { pathParam: 'id' }), patch: operation('updateUser', { pathParam: 'id' }) },
        '/users/search': { post: operation('searchUsers') },
        '/orders/{id}/approve': { post: operation('approveOrder', { pathParam: 'id' }) },
        '/users/{id}/block': { post: operation('blockUser', { pathParam: 'id' }) },
        '/files/{id}/download': {
          get: operation('downloadFile', {
            pathParam: 'id',
            responseContentType: 'application/octet-stream',
            responseSchema: { type: 'string', format: 'binary' },
          }),
        },
        '/files/upload': {
          post: operation('uploadFile', {
            requestContentType: 'multipart/form-data',
            requestSchema: objectSchema({ file: { type: 'string', format: 'binary' } }),
            responseSchema: null,
          }),
        },
        '/legacy/ping': { options: operation('legacyPing') },
      },
    })
    const resources = detectResources(normalized.operations)
    const diagnostics = collectDiagnostics(normalized)
    const normalizedIds = normalized.operations.map((operation) => operation.id).filter((id): id is string => Boolean(id))
    const preservedIds = operationIds(resources)
    const diagnosedIds = normalized.operations
      .filter((operation) =>
        diagnostics.some((diagnostic) => String(diagnostic.location ?? '').includes(`${operation.method.toUpperCase()} ${operation.path}`)),
      )
      .map((operation) => operation.id)
      .filter((id): id is string => Boolean(id))

    expect(normalizedIds).toHaveLength(13)
    expect(new Set([...preservedIds, ...diagnosedIds])).toEqual(new Set(normalizedIds))
    expect(preservedIds).toEqual(normalizedIds.slice().sort())
    expect(diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'unsupported-operation', location: 'OPTIONS /legacy/ping' })]))
  })
})

type OperationOptions = {
  pathParam?: string
  tags?: string[]
  summary?: string
  requestContentType?: string
  responseContentType?: string
  requestSchema?: Record<string, unknown> | null
  responseSchema?: Record<string, unknown> | null
}

function operation(operationId: string, options: OperationOptions = {}) {
  const requestContentType = options.requestContentType ?? 'application/json'
  const responseContentType = options.responseContentType ?? 'application/json'
  const requestSchema = options.requestSchema === undefined ? objectSchema({ name: { type: 'string' } }) : options.requestSchema
  const responseSchema = options.responseSchema === undefined ? objectSchema({ id: { type: 'string' } }) : options.responseSchema

  return {
    operationId,
    tags: options.tags ?? [operationId.replace(/[A-Z].*/, '') || 'Default'],
    summary: options.summary,
    parameters: options.pathParam ? [{ name: options.pathParam, in: 'path', required: true, schema: { type: 'string' } }] : [],
    requestBody: requestSchema
      ? {
          content: {
            [requestContentType]: { schema: requestSchema },
          },
        }
      : undefined,
    responses: {
      '200': {
        description: 'OK',
        ...(responseSchema
          ? {
              content: {
                [responseContentType]: { schema: responseSchema },
              },
            }
          : {}),
      },
    },
  }
}

function objectSchema(properties: Record<string, unknown>) {
  return {
    type: 'object',
    properties,
  }
}

function operationIds(resources: ReturnType<typeof detectResources>): string[] {
  return resources.flatMap((resource) => resource.operationsList.map((operation) => operation.id).filter((id): id is string => Boolean(id))).sort()
}

async function planFor(normalized: ReturnType<typeof normalizeOpenApi>) {
  return createGenerationPlan({
    config: resolveForgeConfig({ input: './openapi.yaml' }),
    normalized,
    resources: detectResources(normalized.operations),
    cwd: process.cwd(),
  })
}
