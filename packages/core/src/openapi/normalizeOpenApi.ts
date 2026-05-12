import type {
  HttpMethod,
  NormalizedOpenApi,
  NormalizedOperation,
  NormalizedSchema,
  OpenApiDocument,
  OpenApiOperation,
  OpenApiParameter,
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

      operations.push(normalizeOperation(document, path, method, operation, pathItem.parameters ?? [], operationIds))
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
  document: OpenApiDocument,
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
  const responseBodyEmpty = hasEmptySuccessResponse(operation.responses)
  const hasFilePayload =
    hasFileContentType(requestContentTypes) || hasFileContentType(responseContentTypes) || hasBinarySchema(requestBodySchema)
  return {
    id: operation.operationId ? operationIds.identifier(operation.operationId, `${method}Operation`) : null,
    sourceOperationId: operation.operationId ?? null,
    method,
    path,
    tags: operation.tags ?? [],
    summary: operation.summary ?? null,
    parameters: mergeParameters(document, pathParameters ?? [], operation.parameters ?? []),
    requestContentTypes,
    responseContentTypes,
    isJsonRequest: requestContentTypes.some(isJsonCompatibleContentType),
    isJsonResponse: responseContentTypes.some(isJsonCompatibleContentType),
    hasFilePayload,
    operationKind: classifyOperationKind(path, method, operation, requestContentTypes, responseContentTypes, hasFilePayload),
    requestBodySchema,
    responseSchema,
    responseBodyEmpty,
    hasErrorResponse: Object.keys(operation.responses ?? {}).some((status) => status.startsWith('4') || status.startsWith('5')),
    operation,
  }
}

function mergeParameters(document: OpenApiDocument, pathParameters: NonNullable<OpenApiOperation['parameters']>, operationParameters: NonNullable<OpenApiOperation['parameters']>) {
  const merged = new Map<string, OpenApiParameter>()
  for (const candidate of [...pathParameters, ...operationParameters]) {
    const parameter = resolveParameterRef(document, candidate)
    if (!parameter) continue
    merged.set(`${parameter.in}:${parameter.name}`, parameter)
  }

  return [...merged.values()]
}

function resolveParameterRef(document: OpenApiDocument, parameter: NonNullable<OpenApiOperation['parameters']>[number]): OpenApiParameter | null {
  if (!('$ref' in parameter)) return parameter
  const name = parameter.$ref.match(/^#\/components\/parameters\/(.+)$/)?.[1]
  return name ? document.components?.parameters?.[name] ?? null : null
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

  return (
    extractSchema(requestBody.content, isJsonCompatibleContentType) ??
    extractSchema(requestBody.content, isMultipartContentType) ??
    extractSchema(requestBody.content, isBinaryContentType) ??
    extractSchema(requestBody.content, isFormUrlEncodedContentType) ??
    extractSchema(requestBody.content, isTextContentType)
  )
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

  return (
    extractSchema(response.content, isJsonCompatibleContentType) ??
    extractSchema(response.content, isBinaryContentType) ??
    extractSchema(response.content, isWildcardContentType, hasBinarySchema) ??
    extractSchema(response.content, isTextContentType) ??
    extractSchema(response.content, isWildcardContentType)
  )
}

function hasEmptySuccessResponse(responses: Record<string, OpenApiResponse> | undefined): boolean {
  if (!responses) return false
  const successStatus = Object.keys(responses).find((status) => status.startsWith('2')) ?? 'default'
  const response = responses[successStatus]
  return Boolean(response && (!response.content || Object.keys(response.content).length === 0))
}

function extractSchema(
  content: unknown,
  predicate: (contentType: string) => boolean,
  schemaPredicate: (schema: OpenApiSchema) => boolean = () => true,
): OpenApiSchema | null {
  if (!isObject(content)) {
    return null
  }

  const entry = Object.entries(content).find(([contentType, mediaType]) => {
    if (!predicate(contentType) || !isObject(mediaType) || !isObject(mediaType.schema)) return false
    return schemaPredicate(mediaType.schema as OpenApiSchema)
  })
  const mediaType = entry?.[1]
  if (!isObject(mediaType) || !isObject(mediaType.schema)) {
    return null
  }

  return mediaType.schema as OpenApiSchema
}

function getRequestContentTypes(requestBody: unknown): string[] {
  if (!isObject(requestBody) || !isObject(requestBody.content)) return []
  return Object.keys(requestBody.content).map(normalizeContentType)
}

function getResponseContentTypes(responses: Record<string, OpenApiResponse> | undefined): string[] {
  return Object.values(responses ?? {}).flatMap((response) => Object.keys(response.content ?? {}).map(normalizeContentType))
}

function normalizeContentType(contentType: string): string {
  return contentType.split(';')[0]?.trim().toLowerCase() ?? ''
}

function isJsonCompatibleContentType(contentType: string): boolean {
  const normalized = contentType.split(';')[0]?.trim().toLowerCase() ?? ''
  return normalized === 'application/json' || normalized.endsWith('+json')
}

function isMultipartContentType(contentType: string): boolean {
  const normalized = contentType.split(';')[0]?.trim().toLowerCase() ?? ''
  return normalized === 'multipart/form-data'
}

function isFormUrlEncodedContentType(contentType: string): boolean {
  const normalized = contentType.split(';')[0]?.trim().toLowerCase() ?? ''
  return normalized === 'application/x-www-form-urlencoded'
}

function isBinaryContentType(contentType: string): boolean {
  const normalized = contentType.split(';')[0]?.trim().toLowerCase() ?? ''
  return normalized === 'application/octet-stream' || normalized === 'application/pdf' || normalized.startsWith('image/')
}

function isTextContentType(contentType: string): boolean {
  const normalized = contentType.split(';')[0]?.trim().toLowerCase() ?? ''
  return normalized.startsWith('text/') || normalized === 'application/text'
}

function isWildcardContentType(contentType: string): boolean {
  return contentType.split(';')[0]?.trim().toLowerCase() === '*/*'
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

  const haystack = `${path} ${operation.operationId ?? ''} ${operation.summary ?? ''} ${(operation.tags ?? []).join(' ')}`.toLowerCase()
  if ((method === 'post' || (method === 'get' && !hasTrailingIdentitySegment(path))) && hasSearchIntent(haystack)) return 'search-resource'
  if (
    (method === 'post' || method === 'put' || method === 'patch' || method === 'delete') &&
    (haystack.includes('/action/') || haystack.includes('/actions/') || !isCanonicalCrudPath(path) || isSubresourceActionPath(path) || hasActionIntent(haystack)) &&
    /(\/actions?\/|approve|archive|confirm|reject|start|submit|generate|import|export|manual|forward|change|block|unblock|details|personal|status|validate|cancel)/.test(haystack)
  ) {
    return 'action-operation'
  }
  if (method === 'get' && /(dashboard|summary|metrics|stats|statistics|main|categories)/.test(haystack)) return 'dashboard-resource'
  if (method === 'get' && (isSubresourceActionPath(path) || hasReadOnlyIntent(haystack))) return 'read-only-resource'
  if (method === 'get' && !isCanonicalCrudPath(path)) return 'read-only-resource'
  return 'crud-resource'
}

function isCanonicalCrudPath(path: string): boolean {
  const segments = path.split('/').filter(Boolean).filter((segment) => !['api', 'v1', 'v2', 'v3'].includes(segment.toLowerCase()))
  const last = segments.at(-1)
  if (!last) return false
  if (last.startsWith('{')) return true
  return true
}

function hasTrailingIdentitySegment(path: string): boolean {
  return significantSegments(path).at(-1)?.startsWith('{') ?? false
}

function isSubresourceActionPath(path: string): boolean {
  const segments = significantSegments(path)
  const last = segments.at(-1)?.toLowerCase()
  if (!last || last.startsWith('{')) return false
  const hasParentIdentity = segments.slice(0, -1).some((segment) => segment.startsWith('{'))
  return hasParentIdentity && /^(details?|personal|status|state|validate|validation|cancel|confirm|approve|archive|reject)$/.test(last)
}

function significantSegments(path: string): string[] {
  return path.split('/').filter(Boolean).filter((segment) => !['api', 'v1', 'v2', 'v3'].includes(segment.toLowerCase()))
}

function hasActionIntent(value: string): boolean {
  return /(approve|archive|confirm|reject|start|submit|generate|import|export|manual|forward|change|block|unblock|validate|cancel)/.test(value)
}

function hasSearchIntent(value: string): boolean {
  return /(^|[^a-z0-9])(search|find|query|filter)([^a-z0-9]|$)/.test(value)
}

function hasReadOnlyIntent(value: string): boolean {
  return /(lookup|options|reference|preview|history|status|state|availability)/.test(value)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
