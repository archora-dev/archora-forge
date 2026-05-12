import type {
  HttpMethod,
  NormalizedOpenApi,
  NormalizedOperation,
  NormalizedSchema,
  OpenApiDocument,
  OpenApiOperation,
  OpenApiResponse,
  OpenApiSchema,
  OperationKind,
} from './openapi.types.js'
import { mergeSimpleAllOfSchema } from './composition.js'
import { createIdentifierRegistry } from '../generation/identifiers.js'

const httpMethods: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head']

export function normalizeOpenApi(document: OpenApiDocument): NormalizedOpenApi {
  const operations: NormalizedOperation[] = []
  const operationIds = createIdentifierRegistry()

  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    for (const method of httpMethods) {
      const operation = pathItem[method]
      if (!operation) {
        continue
      }

      operations.push(normalizeOperation(path, method, operation, pathItem.parameters ?? [], operationIds))
    }
  }

  return {
    document,
    operations,
    schemas: normalizeSchemas(document),
    tags: normalizeTags(document, operations),
  }
}

function normalizeOperation(
  path: string,
  method: HttpMethod,
  operation: OpenApiOperation,
  pathParameters: OpenApiOperation['parameters'],
  operationIds: ReturnType<typeof createIdentifierRegistry>,
): NormalizedOperation {
  const requestContentTypes = getRequestContentTypes(operation.requestBody)
  const responseContentTypes = getResponseContentTypes(operation.responses)
  const requestBodySchema = extractRequestBodySchema(operation.requestBody)
  const responseSchema = extractResponseSchema(operation.responses)
  const hasFilePayload =
    hasFileContentType(requestContentTypes) || hasFileContentType(responseContentTypes) || hasBinarySchema(requestBodySchema)
  return {
    id: operation.operationId ? operationIds.identifier(operation.operationId, `${method}Operation`) : null,
    method,
    path,
    tags: operation.tags ?? [],
    summary: operation.summary ?? null,
    parameters: mergeParameters(pathParameters ?? [], operation.parameters ?? []),
    requestContentTypes,
    responseContentTypes,
    isJsonRequest: requestContentTypes.some(isJsonCompatibleContentType),
    isJsonResponse: responseContentTypes.some(isJsonCompatibleContentType),
    hasFilePayload,
    operationKind: classifyOperationKind(path, method, operation, requestContentTypes, responseContentTypes, hasFilePayload),
    requestBodySchema,
    responseSchema,
    hasErrorResponse: Object.keys(operation.responses ?? {}).some((status) => status.startsWith('4') || status.startsWith('5')),
    operation,
  }
}

function mergeParameters(pathParameters: NonNullable<OpenApiOperation['parameters']>, operationParameters: NonNullable<OpenApiOperation['parameters']>) {
  const merged = new Map<string, (typeof operationParameters)[number]>()
  for (const parameter of [...pathParameters, ...operationParameters]) {
    merged.set(`${parameter.in}:${parameter.name}`, parameter)
  }

  return [...merged.values()]
}

function normalizeSchemas(document: OpenApiDocument): NormalizedSchema[] {
  return Object.entries(document.components?.schemas ?? {}).map(([name, schema]) => ({
    name,
    schema: mergeSimpleAllOfSchema(document, schema) ?? schema,
  }))
}

function normalizeTags(document: OpenApiDocument, operations: NormalizedOperation[]): string[] {
  const tags = new Set<string>()
  for (const tag of document.tags ?? []) {
    tags.add(tag.name)
  }
  for (const operation of operations) {
    for (const tag of operation.tags) {
      tags.add(tag)
    }
  }

  return [...tags]
}

function extractRequestBodySchema(requestBody: unknown): OpenApiSchema | null {
  if (!isObject(requestBody) || !isObject(requestBody.content)) {
    return null
  }

  return extractJsonSchema(requestBody.content)
}

function extractResponseSchema(responses: Record<string, OpenApiResponse> | undefined): OpenApiSchema | null {
  if (!responses) {
    return null
  }

  const successStatus = Object.keys(responses).find((status) => status.startsWith('2')) ?? 'default'
  const response = responses[successStatus]
  if (!response?.content) {
    return null
  }

  return extractJsonSchema(response.content)
}

function extractJsonSchema(content: unknown): OpenApiSchema | null {
  if (!isObject(content)) {
    return null
  }

  const jsonEntry = Object.entries(content).find(([contentType]) => isJsonCompatibleContentType(contentType))
  const jsonContent = jsonEntry?.[1]
  if (!isObject(jsonContent) || !isObject(jsonContent.schema)) {
    return null
  }

  return jsonContent.schema as OpenApiSchema
}

function getRequestContentTypes(requestBody: unknown): string[] {
  if (!isObject(requestBody) || !isObject(requestBody.content)) return []
  return Object.keys(requestBody.content)
}

function getResponseContentTypes(responses: Record<string, OpenApiResponse> | undefined): string[] {
  return Object.values(responses ?? {}).flatMap((response) => Object.keys(response.content ?? {}))
}

function isJsonCompatibleContentType(contentType: string): boolean {
  const normalized = contentType.split(';')[0]?.trim().toLowerCase() ?? ''
  return normalized === 'application/json' || normalized.endsWith('+json')
}

function hasFileContentType(contentTypes: string[]): boolean {
  return contentTypes.some((contentType) => {
    const normalized = contentType.split(';')[0]?.trim().toLowerCase() ?? ''
    return normalized === 'multipart/form-data' || normalized === 'application/octet-stream'
  })
}

function hasBinarySchema(schema: OpenApiSchema | null): boolean {
  if (!schema) return false
  if (schema.format === 'binary') return true
  if (schema.items && hasBinarySchema(schema.items)) return true
  return Object.values(schema.properties ?? {}).some(hasBinarySchema)
}

function classifyOperationKind(
  path: string,
  method: HttpMethod,
  operation: OpenApiOperation,
  requestContentTypes: string[],
  responseContentTypes: string[],
  hasFilePayload: boolean,
): OperationKind {
  if (method === 'options' || method === 'head') return 'unsupported-operation'
  if (hasFilePayload || hasFileContentType(requestContentTypes) || hasFileContentType(responseContentTypes)) return 'file-operation'

  const haystack = `${path} ${operation.operationId ?? ''} ${operation.summary ?? ''}`.toLowerCase()
  if (method === 'post' && /\bsearch\b|\/search\b|search/.test(haystack)) return 'search-resource'
  if (method === 'post' && /(\/actions?\/|approve|confirm|reject|start|generate|import|export|manual|forward|change|block|unblock)/.test(haystack)) {
    return 'action-operation'
  }
  if (method === 'get' && /(dashboard|summary|metrics|stats|statistics|main|categories)/.test(haystack)) return 'dashboard-resource'
  return 'crud-resource'
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
