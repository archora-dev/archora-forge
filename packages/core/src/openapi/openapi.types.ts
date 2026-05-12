export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head'

export type OperationKind =
  | 'crud-resource'
  | 'dashboard-resource'
  | 'search-resource'
  | 'action-operation'
  | 'file-operation'
  | 'read-only-resource'
  | 'unsupported-operation'

export type OpenApiDocument = {
  openapi: string
  info?: {
    title?: string
    version?: string
  }
  paths?: Record<string, OpenApiPathItem>
  components?: {
    parameters?: Record<string, OpenApiParameter>
    schemas?: Record<string, OpenApiSchema>
    securitySchemes?: Record<string, unknown>
  }
  tags?: Array<{ name: string; description?: string }>
}

export type OpenApiParameterLike = OpenApiParameter | { $ref: string }

export type OpenApiPathItem = Partial<Record<HttpMethod, OpenApiOperation>> & {
  parameters?: OpenApiParameterLike[]
}

export type OpenApiOperation = {
  operationId?: string
  summary?: string
  tags?: string[]
  parameters?: OpenApiParameterLike[]
  requestBody?: unknown
  responses?: Record<string, OpenApiResponse>
  security?: unknown[]
}

export type OpenApiResponse = {
  description?: string
  content?: Record<string, { schema?: OpenApiSchema }>
}

export type OpenApiParameter = {
  name: string
  in: 'path' | 'query' | 'header' | 'cookie'
  required?: boolean
  style?: 'form' | string
  explode?: boolean
  schema?: OpenApiSchema
}

export type OpenApiSchema = {
  type?: string | string[]
  format?: string
  const?: OpenApiEnumValue
  default?: unknown
  enum?: OpenApiEnumValue[]
  properties?: Record<string, OpenApiSchema>
  additionalProperties?: boolean | OpenApiSchema
  required?: string[]
  items?: OpenApiSchema
  $ref?: string
  description?: string
  nullable?: boolean
  deprecated?: boolean
  readOnly?: boolean
  writeOnly?: boolean
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  oneOf?: OpenApiSchema[]
  anyOf?: OpenApiSchema[]
  allOf?: OpenApiSchema[]
  discriminator?: unknown
}

export type OpenApiEnumValue = string | number | boolean | null

export type NormalizedOperation = {
  id: string | null
  sourceOperationId: string | null
  method: HttpMethod
  path: string
  tags: string[]
  summary: string | null
  parameters: OpenApiParameter[]
  requestContentTypes: string[]
  responseContentTypes: string[]
  isJsonRequest: boolean
  isJsonResponse: boolean
  hasFilePayload: boolean
  operationKind: OperationKind
  requestBodySchema: OpenApiSchema | null
  responseSchema: OpenApiSchema | null
  responseBodyEmpty: boolean
  hasErrorResponse: boolean
  operation: OpenApiOperation
}

export type NormalizedSchema = {
  name: string
  schema: OpenApiSchema
}

export type NormalizedOpenApi = {
  document: OpenApiDocument
  operations: NormalizedOperation[]
  schemas: NormalizedSchema[]
  tags: string[]
}
