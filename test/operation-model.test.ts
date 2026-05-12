import { describe, expect, test } from 'vitest'

import {
  collectDiagnostics,
  createGenerationPlan,
  detectResources,
  normalizeOpenApi,
} from '../packages/core/src/index.js'
import { resolveForgeConfig } from '../packages/config/src/index.js'

describe('Real API operation model', () => {
  test('preserves operations with repeated last path segments instead of overwriting CRUD slots', () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Repeated segments', version: '1.0.0' },
      paths: {
        '/registered/main/v1': { get: operation('registeredMain') },
        '/appeal/main/v1': { get: operation('appealMain') },
        '/needRegistration/main/v1': { get: operation('needRegistrationMain') },
      },
    })

    const resources = detectResources(normalized.operations)
    const preservedIds = resources.flatMap((resource) => resource.operationsList.map((item) => item.id))

    expect(preservedIds.sort()).toEqual(['appealMain', 'needRegistrationMain', 'registeredMain'])
    expect(resources.map((resource) => resource.name).sort()).toEqual(['appealMain', 'needRegistrationMain', 'registeredMain'])
    expect(resources.every((resource) => resource.kind === 'dashboard-resource' || resource.kind === 'read-only-resource')).toBe(true)
  })

  test('normalizes JSON-compatible content types with charset and vendor suffixes', () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Content types', version: '1.0.0' },
      paths: {
        '/search': {
          post: {
            operationId: 'extendedSearch',
            tags: ['Search'],
            requestBody: {
              content: {
                'application/vnd.company.search+json': { schema: { $ref: '#/components/schemas/SearchRequest' } },
              },
            },
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json;charset=utf-8': { schema: { $ref: '#/components/schemas/SearchResponse' } },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          SearchRequest: objectSchema({ query: { type: 'string' } }),
          SearchResponse: objectSchema({ items: { type: 'array', items: { type: 'string' } } }),
        },
      },
    })

    expect(normalized.operations[0]).toMatchObject({
      requestContentTypes: ['application/vnd.company.search+json'],
      responseContentTypes: ['application/json'],
      isJsonRequest: true,
      isJsonResponse: true,
      operationKind: 'search-resource',
    })
    expect(normalized.operations[0]?.requestBodySchema?.$ref).toBe('#/components/schemas/SearchRequest')
    expect(normalized.operations[0]?.responseSchema?.$ref).toBe('#/components/schemas/SearchResponse')
  })

  test('keeps raw operationId alongside sanitized unique generated ids', () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Operation ids', version: '1.0.0' },
      paths: {
        '/users': { get: operation('user.list') },
        '/accounts': { get: operation('user.list') },
      },
    })

    expect(normalized.operations.map((item) => item.sourceOperationId)).toEqual(['user.list', 'user.list'])
    expect(normalized.operations.map((item) => item.id)).toEqual(['userList', 'userList2'])
  })

  test('classifies search, action, file and unsupported operations', () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Kinds', version: '1.0.0' },
      paths: {
        '/recruits/search': { post: operation('searchRecruits') },
        '/actions/confirmRecruits': { post: operation('confirmRecruits') },
        '/attachments/upload': {
          post: {
            operationId: 'uploadAttachment',
            tags: ['Attachments'],
            requestBody: {
              content: {
                'multipart/form-data': { schema: objectSchema({ file: { type: 'string', format: 'binary' } }) },
              },
            },
            responses: { '204': { description: 'Uploaded' } },
          },
        },
        '/stream': { head: operation('headStream') },
      },
    })

    expect(normalized.operations.map((item) => [item.id, item.operationKind])).toEqual([
      ['searchRecruits', 'search-resource'],
      ['confirmRecruits', 'action-operation'],
      ['uploadAttachment', 'file-operation'],
      ['headStream', 'unsupported-operation'],
    ])
  })

  test('keeps search resources as search-first when paired with a detail endpoint', () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Search detail', version: '1.0.0' },
      paths: {
        '/search/v1': { post: operation('searchCreate') },
        '/search/{id}/v1': {
          get: {
            ...operation('searchDetail'),
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          },
        },
      },
    })

    const [resource] = detectResources(normalized.operations)

    expect(resource?.kind).toBe('search-resource')
    expect(resource?.operations.create).toBeUndefined()
    expect(resource?.operations.detail?.id).toBe('searchDetail')
    expect(resource?.operationsByKind['search-resource']?.map((item) => item.id)).toEqual(['searchCreate'])
  })

  test('generates explicit panels for non-CRUD operation resources', async () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Generated panels', version: '1.0.0' },
      paths: {
        '/reports/search': { post: operation('searchReports') },
        '/files/upload': {
          post: {
            operationId: 'uploadFile',
            tags: ['Files'],
            requestBody: { content: { 'multipart/form-data': { schema: objectSchema({ file: { type: 'string', format: 'binary' } }) } } },
            responses: { '204': { description: 'OK' } },
          },
        },
        '/legacy/ping': { options: operation('legacyPing') },
      },
    })
    const plan = await createGenerationPlan({
      config: resolveForgeConfig({ input: './openapi.yaml' }),
      normalized,
      resources: detectResources(normalized.operations),
      cwd: process.cwd(),
    })
    const content = plan.files.map((file) => file.content).join('\n')
    const diagnostics = collectDiagnostics(normalized)

    expect(content).toContain("resource: 'reportsSearch'")
    expect(content).toContain("resource: 'filesUpload'")
    expect(content).toContain("resource: 'legacyPing'")
    expect(plan.files.some((file) => file.path.endsWith('.vue'))).toBe(false)
    expect(diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'unsupported-operation' })]))
  })
})

function operation(operationId: string) {
  return {
    operationId,
    tags: [operationId.replace(/[A-Z].*/, '') || 'Default'],
    responses: {
      '200': {
        description: 'OK',
        content: { 'application/json': { schema: objectSchema({ id: { type: 'string' } }) } },
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
