import { describe, expect, test } from 'vitest'

import {
  collectDiagnostics,
  createGenerationPlan,
  detectResources,
  normalizeOpenApi,
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

  test('generates honest action panels for action operations', async () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Action operations', version: '1.0.0' },
      paths: {
        '/orders/{id}/approve': { post: operation('approveOrder', { pathParam: 'id' }) },
        '/users/{id}/block': { post: operation('blockUser', { pathParam: 'id' }) },
      },
    })
    const resources = detectResources(normalized.operations)
    const plan = await planFor(normalized)
    const content = plan.files.map((file) => file.content).join('\n')

    expect(normalized.operations.map((operation) => [operation.id, operation.operationKind])).toEqual([
      ['approveOrder', 'action-operation'],
      ['blockUser', 'action-operation'],
    ])
    expect(resources.every((resource) => resource.kind === 'action-operation')).toBe(true)
    expect(resources.every((resource) => resource.operations.create === undefined)).toBe(true)
    expect(content).toContain('Action operation')
    expect(content).not.toContain('Create ordersApprove')
    expect(content).not.toContain('Create usersBlock')
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
    const tableContent = plan.files
      .filter((file) => file.path.endsWith('Table.generated.vue'))
      .map((file) => file.content)
      .join('\n')

    expect(normalized.operations.map((operation) => [operation.id, operation.operationKind])).toEqual([
      ['downloadFile', 'file-operation'],
      ['uploadFile', 'file-operation'],
    ])
    expect(operationIds(resources)).toEqual(['downloadFile', 'uploadFile'])
    expect(resources.every((resource) => resource.kind === 'file-operation')).toBe(true)
    expect(resources.every((resource) => Object.keys(resource.operations).length === 0)).toBe(true)
    expect(content).toContain('File operation')
    expect(tableContent).not.toContain('Create files')
    expect(tableContent).not.toContain('<ArchDataTable')
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
  })

  test('preserves non-json operations with diagnostics instead of treating them as normal JSON CRUD', () => {
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
      },
    })
    const resources = detectResources(normalized.operations)
    const diagnostics = collectDiagnostics(normalized)

    expect(normalized.operations.map((operation) => [operation.id, operation.isJsonRequest, operation.isJsonResponse])).toEqual([
      ['sendPlainMessage', false, false],
      ['sendRawFile', false, false],
    ])
    expect(operationIds(resources)).toEqual(['sendPlainMessage', 'sendRawFile'])
    expect(resources.find((resource) => resource.name === 'filesRaw')?.kind).toBe('file-operation')
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'unsupported-content-type', location: 'POST /messages/plain' }),
        expect.objectContaining({ code: 'unsupported-content-type', location: 'POST /files/raw' }),
      ]),
    )
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
    tags: [operationId.replace(/[A-Z].*/, '') || 'Default'],
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
