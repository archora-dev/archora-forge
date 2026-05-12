import type { NormalizedOpenApi, NormalizedOperation, OpenApiParameter, OpenApiSchema } from '../openapi/openapi.types.js'
import type { DetectedResource } from '../resources/resources.types.js'
import { quoteObjectKeyIfNeeded, toSafeTypeName } from './identifiers.js'

export type ResourceOperationTypes = {
  idType: string
  detailResponseType: string
  listParamsType: string
  listResponseType: string
  createRequestType: string
  createResponseType: string
  updateRequestType: string
  updateResponseType: string
  entityType: string
}

export type OperationTypeNames = {
  paramsType: string
  requestType: string
  responseType: string
}

export function createResourceTypeNames(resource: DetectedResource): ResourceOperationTypes {
  const entity = toSafeTypeName(resource.entity)
  return {
    idType: `${entity}Id`,
    detailResponseType: `${entity}DetailResponse`,
    listParamsType: `${entity}sListParams`,
    listResponseType: `${entity}sListResponse`,
    createRequestType: `Create${entity}Request`,
    createResponseType: `Create${entity}Response`,
    updateRequestType: `Update${entity}Request`,
    updateResponseType: `Update${entity}Response`,
    entityType: entity,
  }
}

export function createOperationTypeNames(operation: NormalizedOperation): OperationTypeNames {
  const operationName = toSafeTypeName(operation.id ?? `${operation.method}Operation`)
  return {
    paramsType: `${operationName}OperationParams`,
    requestType: `${operationName}OperationRequest`,
    responseType: `${operationName}OperationResponse`,
  }
}

export function createTypeScriptTypes(normalized: NormalizedOpenApi, resource: DetectedResource): string {
  const declarations: string[] = []
  if (!normalized.schemas.some((schema) => toSafeTypeName(schema.name) === toSafeTypeName(resource.entity))) {
    declarations.push(`export interface ${toSafeTypeName(resource.entity)} {\n  [key: string]: unknown\n}`)
  }

  declarations.push(createOperationAliases(normalized, resource))
  const body = declarations.filter(Boolean).join('\n\n')
  const imports = collectSharedTypeImports(normalized, body)
  const importBlock =
    imports.length > 0
      ? `import type { ${imports.join(', ')} } from '../components.types'\n\nexport type { ${imports.join(', ')} } from '../components.types'\n\n`
      : ''

  return `${importBlock}${body}\n`
}

export function createSharedSchemaTypes(normalized: NormalizedOpenApi): string {
  const declarations: string[] = []
  const enumAliases = new Map<string, string>()

  for (const schema of normalized.schemas) {
    declarations.push(createSchemaDeclaration(normalized, toSafeTypeName(schema.name), schema.schema, enumAliases))
  }

  declarations.unshift(...[...enumAliases.entries()].map(([name, value]) => `export type ${name} = ${value}`))

  return declarations.length > 0 ? `${declarations.filter(Boolean).join('\n\n')}\n` : 'export {}\n'
}

export function schemaToTypeScript(
  normalized: NormalizedOpenApi,
  schema: OpenApiSchema | null | undefined,
  options: { mode: 'request' | 'response'; enumName?: string; indent?: number } = { mode: 'response' },
): string {
  if (!schema) return 'unknown'
  if (schema.$ref) return toSafeTypeName(schema.$ref.split('/').at(-1) ?? 'unknown')
  if (schema.enum) return schema.enum.map((value) => `'${value}'`).join(' | ')
  if (schema.type === 'string') return 'string'
  if (schema.type === 'number' || schema.type === 'integer') return 'number'
  if (schema.type === 'boolean') return 'boolean'
  if (schema.type === 'array') return `${schemaToTypeScript(normalized, schema.items, options)}[]`
  if (schema.type === 'object' || schema.properties) {
    const indent = options.indent ?? 0
    const childIndent = ' '.repeat(indent + 2)
    const closeIndent = ' '.repeat(indent)
    const required = new Set(schema.required ?? [])
    const lines = Object.entries(schema.properties ?? {})
      .filter(([, property]) => (options.mode === 'request' ? !property.readOnly : !property.writeOnly))
      .map(([name, property]) => {
        const optional = required.has(name) ? '' : '?'
        const nullable = property.nullable ? ' | null' : ''
        return `${childIndent}${quoteObjectKeyIfNeeded(name)}${optional}: ${schemaToTypeScript(normalized, property, {
          ...options,
          indent: indent + 2,
        })}${nullable}`
      })

    return `{\n${lines.join('\n')}\n${closeIndent}}`
  }

  return 'unknown'
}

export function getPathParams(operation: NormalizedOperation | undefined): OpenApiParameter[] {
  return (operation?.parameters ?? []).filter((parameter) => parameter.in === 'path')
}

export function getQueryParams(operation: NormalizedOperation | undefined): OpenApiParameter[] {
  return (operation?.parameters ?? []).filter((parameter) => parameter.in === 'query')
}

export function getOperationParams(operation: NormalizedOperation | undefined): OpenApiParameter[] {
  return (operation?.parameters ?? []).filter((parameter) => parameter.in === 'path' || parameter.in === 'query')
}

export function resolveSchema(normalized: NormalizedOpenApi, schema: OpenApiSchema | null | undefined): OpenApiSchema | null {
  if (!schema) return null
  if (!schema.$ref) return schema
  const name = schema.$ref.split('/').at(-1)
  return normalized.schemas.find((candidate) => candidate.name === name || toSafeTypeName(candidate.name) === toSafeTypeName(name ?? ''))?.schema ?? schema
}

export function resolveSchemaName(schema: OpenApiSchema | null | undefined): string | null {
  if (!schema?.$ref) return null
  return toSafeTypeName(schema.$ref.split('/').at(-1) ?? '')
}

function createSchemaDeclaration(
  normalized: NormalizedOpenApi,
  name: string,
  schema: OpenApiSchema,
  enumAliases: Map<string, string>,
): string {
  const mode = name.endsWith('Dto') ? 'request' : 'response'
  const required = new Set(schema.required ?? [])
  const lines = Object.entries(schema.properties ?? {})
    .filter(([, property]) => (mode === 'request' ? !property.readOnly : !property.writeOnly))
    .map(([propertyName, property]) => {
      const enumName = property.enum ? `${name}${toSafeTypeName(propertyName)}` : undefined
      if (enumName && property.enum) {
        enumAliases.set(enumName, property.enum.map((value) => `'${value}'`).join(' | '))
      }
      const optional = required.has(propertyName) ? '' : '?'
      const baseType = enumName ?? schemaToTypeScript(normalized, property, { mode, indent: 2 })
      const nullable = property.nullable ? ' | null' : ''
      return `  ${quoteObjectKeyIfNeeded(propertyName)}${optional}: ${baseType}${nullable}`
    })

  return `export interface ${name} {\n${lines.join('\n')}\n}`
}

function createOperationAliases(normalized: NormalizedOpenApi, resource: DetectedResource): string {
  const names = createResourceTypeNames(resource)
  const detailIdParam = getPathParams(resource.operations.detail)[0] ?? getPathParams(resource.operations.update)[0]
  const idType = detailIdParam?.schema ? schemaToTypeScript(normalized, detailIdParam.schema, { mode: 'request' }) : 'string'
  const listParams = createParamsInterface(normalized, names.listParamsType, getQueryParams(resource.operations.list))
  const listResponse = createResponseDeclaration(normalized, names.listResponseType, resource.operations.list?.responseSchema)
  const detailResponse = createResponseType(normalized, resource.operations.detail?.responseSchema, names.entityType)
  const createRequest =
    resolveSchemaName(resource.operations.create?.requestBodySchema) ??
    (resource.operations.create?.requestBodySchema
      ? schemaToTypeScript(normalized, resource.operations.create.requestBodySchema, { mode: 'request' })
      : `Partial<${resource.entity}>`)
  const updateRequest =
    resolveSchemaName(resource.operations.update?.requestBodySchema) ??
    (resource.operations.update?.requestBodySchema
      ? schemaToTypeScript(normalized, resource.operations.update.requestBodySchema, { mode: 'request' })
      : `Partial<${resource.entity}>`)
  const createResponse = createResponseType(normalized, resource.operations.create?.responseSchema, names.entityType)
  const updateResponse = createResponseType(normalized, resource.operations.update?.responseSchema, names.entityType)
  const operationAliases = resource.operationsList
    .filter((operation) => operation.operationKind !== 'crud-resource')
    .map((operation) => createOperationAlias(normalized, operation))

  return [
    `export type ${names.idType} = ${idType}`,
    `export type ${names.detailResponseType} = ${detailResponse}`,
    listParams,
    listResponse,
    `export type ${names.createRequestType} = ${createRequest}`,
    `export type ${names.createResponseType} = ${createResponse}`,
    `export type ${names.updateRequestType} = ${updateRequest}`,
    `export type ${names.updateResponseType} = ${updateResponse}`,
    ...operationAliases,
  ]
    .filter(Boolean)
    .join('\n\n')
}

function createOperationAlias(normalized: NormalizedOpenApi, operation: NormalizedOperation): string {
  const names = createOperationTypeNames(operation)
  const params = createParamsInterface(normalized, names.paramsType, getOperationParams(operation))
  const request =
    resolveSchemaName(operation.requestBodySchema) ??
    (operation.requestBodySchema ? schemaToTypeScript(normalized, operation.requestBodySchema, { mode: 'request' }) : 'void')
  const response = createResponseType(normalized, operation.responseSchema, 'unknown')

  return [params, `export type ${names.requestType} = ${request}`, `export type ${names.responseType} = ${response}`].join('\n\n')
}

function createParamsInterface(normalized: NormalizedOpenApi, name: string, params: OpenApiParameter[]): string {
  if (params.length === 0) {
    return `export type ${name} = Record<string, never>`
  }

  const lines = params.map((param) => {
    const optional = param.required ? '' : '?'
    return `  ${quoteObjectKeyIfNeeded(param.name)}${optional}: ${schemaToTypeScript(normalized, param.schema, { mode: 'request' })}`
  })

  return `export interface ${name} {\n${lines.join('\n')}\n}`
}

function createResponseDeclaration(normalized: NormalizedOpenApi, name: string, schema: OpenApiSchema | null | undefined): string {
  const schemaName = resolveSchemaName(schema)
  if (schemaName) return `export type ${name} = ${schemaName}`
  if (!schema) return `export type ${name} = unknown`

  const type = schemaToTypeScript(normalized, schema, { mode: 'response', indent: 0 })
  return type.startsWith('{') ? `export interface ${name} ${type}` : `export type ${name} = ${type}`
}

function createResponseType(normalized: NormalizedOpenApi, schema: OpenApiSchema | null | undefined, fallback: string): string {
  return resolveSchemaName(schema) ?? (schema ? schemaToTypeScript(normalized, schema, { mode: 'response' }) : fallback)
}

function collectSharedTypeImports(normalized: NormalizedOpenApi, content: string): string[] {
  return normalized.schemas
    .map((schema) => toSafeTypeName(schema.name))
    .filter((name, index, names) => names.indexOf(name) === index)
    .filter((name) => new RegExp(`\\b${escapeRegExp(name)}\\b`).test(content))
    .sort((left, right) => left.localeCompare(right))
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
