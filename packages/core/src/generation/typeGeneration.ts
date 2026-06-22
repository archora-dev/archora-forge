import type {
  NormalizedOpenApi,
  NormalizedOperation,
  OpenApiParameter,
  OpenApiSchema,
} from '../openapi/openapi.types.js'
import { unwrapAnnotationOnlyAllOfSchema } from '../openapi/composition.js'
import type { DetectedResource } from '../resources/resources.types.js'
import { pluralizeTypeName, quoteObjectKeyIfNeeded, toSafeTypeName } from './identifiers.js'

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
  const collection = pluralizeTypeName(entity)
  return {
    idType: `${entity}Id`,
    detailResponseType: `${entity}DetailResponse`,
    listParamsType: `${collection}ListParams`,
    listResponseType: `${collection}ListResponse`,
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

export function createTypeScriptTypes(
  normalized: NormalizedOpenApi,
  resource: DetectedResource,
): string {
  const declarations: string[] = []
  if (
    !normalized.schemas.some(
      (schema) => toSafeTypeName(schema.name) === toSafeTypeName(resource.entity),
    )
  ) {
    declarations.push(
      `export interface ${toSafeTypeName(resource.entity)} {\n  [key: string]: unknown\n}`,
    )
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
    declarations.push(
      createSchemaDeclaration(normalized, toSafeTypeName(schema.name), schema.schema, enumAliases),
    )
  }

  declarations.unshift(
    ...[...enumAliases.entries()].map(([name, value]) => `export type ${name} = ${value}`),
  )

  return declarations.length > 0 ? `${declarations.filter(Boolean).join('\n\n')}\n` : 'export {}\n'
}

export function schemaToTypeScript(
  normalized: NormalizedOpenApi,
  schema: OpenApiSchema | null | undefined,
  options: { mode: 'request' | 'response'; enumName?: string; indent?: number } = {
    mode: 'response',
  },
): string {
  if (!schema) return 'unknown'
  if (schema.$ref) return toSafeTypeName(schema.$ref.split('/').at(-1) ?? 'unknown')
  const unwrappedAllOf = unwrapAnnotationOnlyAllOfSchema(schema)
  if (unwrappedAllOf) return schemaToTypeScript(normalized, unwrappedAllOf, options)
  if (Array.isArray(schema.type)) {
    const nonNullTypes = schema.type.filter((type) => type !== 'null')
    if (nonNullTypes.length !== 1) return 'unknown'
    const base = schemaToTypeScript(normalized, { ...schema, type: nonNullTypes[0] }, options)
    return schema.type.includes('null') ? `${base} | null` : base
  }
  if (schema.oneOf?.length || schema.anyOf?.length) {
    const branches = schema.oneOf ?? schema.anyOf ?? []
    const discriminator = getDiscriminatorInfo(schema)
    return branches
      .map((branch) => renderUnionBranch(normalized, branch, options, discriminator))
      .join(' | ')
  }
  if (hasConst(schema)) return enumValueToTypeScript(schema.const)
  if (schema.enum) return schema.enum.map(enumValueToTypeScript).join(' | ')
  if (schema.type === 'string' && schema.format === 'binary')
    return options.mode === 'request' || options.indent !== undefined ? 'Blob | File' : 'Blob'
  if (schema.type === 'string') return 'string'
  if (schema.type === 'number' || schema.type === 'integer') return 'number'
  if (schema.type === 'boolean') return 'boolean'
  if (schema.type === 'array')
    return `${toArrayElementType(schemaToTypeScript(normalized, schema.items, options))}[]`
  if (isPureDictionarySchema(schema))
    return createDictionaryType(normalized, schema.additionalProperties, options)
  if (schema.type === 'object' && !schema.properties) return 'Record<string, unknown>'
  if (schema.type === 'object' || schema.properties) {
    const indent = options.indent ?? 0
    const childIndent = ' '.repeat(indent + 2)
    const closeIndent = ' '.repeat(indent)
    const required = new Set(schema.required ?? [])
    const lines = Object.entries(schema.properties ?? {})
      .filter(([, property]) =>
        options.mode === 'request' ? !property.readOnly : !property.writeOnly,
      )
      .map(([name, property]) => {
        const optional = required.has(name) ? '' : '?'
        const nullable = property.nullable ? ' | null' : ''
        return `${childIndent}${quoteObjectKeyIfNeeded(name)}${optional}: ${schemaToTypeScript(
          normalized,
          property,
          {
            ...options,
            indent: indent + 2,
          },
        )}${nullable}`
      })
    const indexSignature = createAdditionalPropertiesIndex(
      normalized,
      schema,
      options,
      childIndent,
      required,
    )
    if (indexSignature) lines.push(indexSignature)

    return `{\n${lines.join('\n')}\n${closeIndent}}`
  }

  return 'unknown'
}

type DiscriminatorInfo = { propertyName: string; mapping: Record<string, string> }

function getDiscriminatorInfo(schema: OpenApiSchema): DiscriminatorInfo | null {
  const raw = schema.discriminator
  if (!raw || typeof raw !== 'object') return null
  const propertyName = (raw as { propertyName?: unknown }).propertyName
  if (typeof propertyName !== 'string' || propertyName.length === 0) return null
  const mapping: Record<string, string> = {}
  const rawMapping = (raw as { mapping?: unknown }).mapping
  if (rawMapping && typeof rawMapping === 'object') {
    for (const [key, value] of Object.entries(rawMapping as Record<string, unknown>)) {
      if (typeof value === 'string') mapping[key] = value
    }
  }
  return { propertyName, mapping }
}

/**
 * Renders a single union branch, pinning the discriminator property to its literal
 * value for `$ref` object branches so the union narrows on `propertyName` in
 * TypeScript. Branches whose discriminant cannot be determined render unchanged.
 */
function renderUnionBranch(
  normalized: NormalizedOpenApi,
  branch: OpenApiSchema,
  options: { mode: 'request' | 'response'; enumName?: string; indent?: number },
  discriminator: DiscriminatorInfo | null,
): string {
  const type = schemaToTypeScript(normalized, branch, options)
  if (!discriminator || type === 'unknown' || !isObjectSchemaBranch(normalized, branch)) return type
  const literal = discriminatorLiteral(normalized, discriminator, branch)
  if (literal === null) return type
  return `(${type} & { ${quoteObjectKeyIfNeeded(discriminator.propertyName)}: ${JSON.stringify(literal)} })`
}

function discriminatorLiteral(
  normalized: NormalizedOpenApi,
  discriminator: DiscriminatorInfo,
  branch: OpenApiSchema,
): string | null {
  if (!branch.$ref) return null
  const refName = branch.$ref.split('/').at(-1) ?? ''
  for (const [key, target] of Object.entries(discriminator.mapping)) {
    if (target === branch.$ref || target.split('/').at(-1) === refName) return key
  }
  // No explicit mapping. The implicit OpenAPI mapping is the schema name, but when the
  // discriminator property is constrained to an enum/const (e.g. `kind: car|truck|drone`)
  // the schema name often differs in case (`Car`). Prefer the enum value that matches the
  // schema name so the narrowed literal actually inhabits the property type.
  const candidates = discriminatorPropertyLiterals(normalized, branch, discriminator.propertyName)
  if (candidates.length > 0) {
    const exact = candidates.find((value) => value === refName)
    if (exact !== undefined) return exact
    const caseInsensitive = candidates.find(
      (value) => value.toLowerCase() === refName.toLowerCase(),
    )
    if (caseInsensitive !== undefined) return caseInsensitive
    if (candidates.length === 1) return candidates[0] ?? null
  }
  return refName.length > 0 ? refName : null
}

function discriminatorPropertyLiterals(
  normalized: NormalizedOpenApi,
  branch: OpenApiSchema,
  propertyName: string,
): string[] {
  const resolved = resolveSchema(normalized, branch)
  const property = resolved?.properties?.[propertyName]
  if (!property) return []
  const propertySchema = resolveSchema(normalized, property) ?? property
  const values = propertySchema.enum ?? (hasConst(propertySchema) ? [propertySchema.const] : [])
  return values.filter((value): value is string => typeof value === 'string')
}

export function isObjectSchemaBranch(
  normalized: NormalizedOpenApi,
  branch: OpenApiSchema,
): boolean {
  const resolved = branch.$ref ? resolveSchema(normalized, branch) : branch
  if (!resolved) return false
  return resolved.type === 'object' || Boolean(resolved.properties) || Boolean(resolved.allOf)
}

/**
 * A `oneOf`/`anyOf` is modeled as a real TypeScript union when every branch renders
 * to a concrete type. A discriminator additionally requires object branches so the
 * narrowing is meaningful (a discriminator over scalar branches stays diagnostic-only).
 */
export function isSupportedUnion(
  normalized: NormalizedOpenApi,
  schema: OpenApiSchema,
  branches: OpenApiSchema[],
): boolean {
  if (branches.length === 0) return false
  const renderable = branches.every(
    (branch) => schemaToTypeScript(normalized, branch, { mode: 'response' }) !== 'unknown',
  )
  if (!renderable) return false
  if (getDiscriminatorInfo(schema))
    return branches.every((branch) => isObjectSchemaBranch(normalized, branch))
  return true
}

export function getPathParams(operation: NormalizedOperation | undefined): OpenApiParameter[] {
  return (operation?.parameters ?? []).filter((parameter) => parameter.in === 'path')
}

export function getQueryParams(operation: NormalizedOperation | undefined): OpenApiParameter[] {
  return (operation?.parameters ?? []).filter((parameter) => parameter.in === 'query')
}

export function getHeaderParams(operation: NormalizedOperation | undefined): OpenApiParameter[] {
  return (operation?.parameters ?? []).filter((parameter) => parameter.in === 'header')
}

export function getOperationParams(operation: NormalizedOperation | undefined): OpenApiParameter[] {
  return (operation?.parameters ?? []).filter(
    (parameter) => parameter.in === 'path' || parameter.in === 'query' || parameter.in === 'header',
  )
}

export function getCollectionParams(resource: DetectedResource): OpenApiParameter[] {
  const params = [
    ...getPathParams(resource.operations.list),
    ...getQueryParams(resource.operations.list),
    ...getPathParams(resource.operations.create),
  ]
  const seen = new Set<string>()
  return params.filter((param) => {
    const key = `${param.in}:${param.name}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function getIdentityParams(resource: DetectedResource): OpenApiParameter[] {
  return (
    [resource.operations.detail, resource.operations.update, resource.operations.delete]
      .map((operation) => getPathParams(operation))
      .find((params) => params.length > 0) ?? []
  )
}

export function resolveSchema(
  normalized: NormalizedOpenApi,
  schema: OpenApiSchema | null | undefined,
): OpenApiSchema | null {
  if (!schema) return null
  if (!schema.$ref) return schema
  const name = schema.$ref.split('/').at(-1)
  return (
    normalized.schemas.find(
      (candidate) =>
        candidate.name === name || toSafeTypeName(candidate.name) === toSafeTypeName(name ?? ''),
    )?.schema ?? schema
  )
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
  // OAS 3.0 `nullable: true` is carried on the schema as a boolean (the 3.1 `type: [..,'null']`
  // form is handled inside schemaToTypeScript). Type-alias declarations must preserve it.
  const nullableSuffix = schema.nullable ? ' | null' : ''

  if (schema.oneOf?.length || schema.anyOf?.length) {
    return `export type ${name} = ${schemaToTypeScript(normalized, schema, { mode: 'response' })}${nullableSuffix}`
  }

  if (isPureDictionarySchema(schema)) {
    return `export type ${name} = ${createDictionaryType(normalized, schema.additionalProperties, { mode: 'response' })}${nullableSuffix}`
  }

  // Top-level enum/scalar/array component schemas are type aliases, not interfaces.
  // Emitting `interface X {}` for an enum loses the literal union and silently widens
  // the type to `{}` (which accepts anything), so callers lose enum safety.
  const isScalarOrEnumDeclaration =
    schema.enum !== undefined ||
    hasConst(schema) ||
    Array.isArray(schema.type) ||
    (typeof schema.type === 'string' && schema.type !== 'object')
  if (isScalarOrEnumDeclaration) {
    return `export type ${name} = ${schemaToTypeScript(normalized, schema, { mode: 'response' })}${nullableSuffix}`
  }

  const mode = name.endsWith('Dto') ? 'request' : 'response'
  const required = new Set(schema.required ?? [])
  const lines = Object.entries(schema.properties ?? {})
    .filter(([, property]) => (mode === 'request' ? !property.readOnly : !property.writeOnly))
    .map(([propertyName, property]) => {
      const enumName = property.enum ? `${name}${toSafeTypeName(propertyName)}` : undefined
      if (enumName && property.enum) {
        enumAliases.set(enumName, property.enum.map(enumValueToTypeScript).join(' | '))
      }
      const optional = required.has(propertyName) ? '' : '?'
      const baseType = enumName ?? schemaToTypeScript(normalized, property, { mode, indent: 2 })
      const nullable = property.nullable ? ' | null' : ''
      return `  ${quoteObjectKeyIfNeeded(propertyName)}${optional}: ${baseType}${nullable}`
    })
  const indexSignature = createAdditionalPropertiesIndex(
    normalized,
    schema,
    { mode, indent: 0 },
    '  ',
    required,
  )
  if (indexSignature) lines.push(indexSignature)

  return `export interface ${name} {\n${lines.join('\n')}\n}`
}

function isPureDictionarySchema(schema: OpenApiSchema): boolean {
  return Boolean(
    (schema.type === 'object' || schema.additionalProperties !== undefined) &&
    schema.additionalProperties !== undefined &&
    Object.keys(schema.properties ?? {}).length === 0,
  )
}

function createDictionaryType(
  normalized: NormalizedOpenApi,
  additionalProperties: boolean | OpenApiSchema | undefined,
  options: { mode: 'request' | 'response'; enumName?: string; indent?: number },
): string {
  if (additionalProperties === false) return 'Record<string, never>'
  if (additionalProperties === true || additionalProperties === undefined)
    return 'Record<string, unknown>'
  return `Record<string, ${schemaToTypeScript(normalized, additionalProperties, options)}>`
}

function createAdditionalPropertiesIndex(
  normalized: NormalizedOpenApi,
  schema: OpenApiSchema,
  options: { mode: 'request' | 'response'; enumName?: string; indent?: number },
  childIndent: string,
  required: Set<string>,
): string | null {
  if (
    schema.additionalProperties === undefined ||
    schema.additionalProperties === false ||
    isPureDictionarySchema(schema)
  )
    return null

  const valueTypes = new Set<string>()
  if (schema.additionalProperties === true) {
    valueTypes.add('unknown')
  } else {
    valueTypes.add(schemaToTypeScript(normalized, schema.additionalProperties, options))
  }

  for (const [propertyName, property] of Object.entries(schema.properties ?? {})) {
    if (options.mode === 'request' && property.readOnly) continue
    if (options.mode === 'response' && property.writeOnly) continue
    valueTypes.add(schemaToTypeScript(normalized, property, options))
    if (property.nullable) valueTypes.add('null')
    if (!required.has(propertyName)) valueTypes.add('undefined')
  }

  return `${childIndent}[key: string]: ${[...valueTypes].join(' | ')}`
}

function toArrayElementType(type: string): string {
  return type.includes(' | ') ? `(${type})` : type
}

function enumValueToTypeScript(value: string | number | boolean | null): string {
  if (typeof value === 'string') return JSON.stringify(value)
  if (value === null) return 'null'
  return String(value)
}

function hasConst(
  schema: OpenApiSchema,
): schema is OpenApiSchema & { const: string | number | boolean | null } {
  return Object.hasOwn(schema, 'const')
}

function createOperationAliases(normalized: NormalizedOpenApi, resource: DetectedResource): string {
  const names = createResourceTypeNames(resource)
  const identityParams = getIdentityParams(resource)
  const idDeclaration =
    identityParams.length > 1
      ? createParamsInterface(normalized, names.idType, identityParams)
      : `export type ${names.idType} = ${identityParams[0]?.schema ? schemaToTypeScript(normalized, identityParams[0].schema, { mode: 'request' }) : 'string'}`
  const listParams = createParamsInterface(
    normalized,
    names.listParamsType,
    getCollectionParams(resource),
  )
  const listResponse = createResponseDeclaration(
    normalized,
    names.listResponseType,
    resource.operations.list,
  )
  const detailResponse = createResponseType(
    normalized,
    resource.operations.detail,
    names.entityType,
  )
  const createRequest =
    createRequestBodyType(normalized, resource.operations.create) ?? `Partial<${names.entityType}>`
  const updateRequest =
    createRequestBodyType(normalized, resource.operations.update) ?? `Partial<${names.entityType}>`
  const createResponse = createResponseType(
    normalized,
    resource.operations.create,
    names.entityType,
  )
  const updateResponse = createResponseType(
    normalized,
    resource.operations.update,
    names.entityType,
  )
  const operationAliases = resource.operationsList
    .filter(
      (operation) =>
        operation.operationKind !== 'unsupported-operation' &&
        !Object.values(resource.operations).includes(operation),
    )
    .map((operation) => createOperationAlias(normalized, operation))

  return [
    idDeclaration,
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

function createOperationAlias(
  normalized: NormalizedOpenApi,
  operation: NormalizedOperation,
): string {
  const names = createOperationTypeNames(operation)
  const params = createParamsInterface(normalized, names.paramsType, getOperationParams(operation))
  const request = createRequestBodyType(normalized, operation) ?? 'void'
  const response = createResponseType(normalized, operation, 'unknown')

  return [
    params,
    `export type ${names.requestType} = ${request}`,
    `export type ${names.responseType} = ${response}`,
  ].join('\n\n')
}

function createRequestBodyType(
  normalized: NormalizedOpenApi,
  operation: NormalizedOperation | undefined,
): string | null {
  if (!operation?.requestBodySchema) return null
  if (operation.requestContentTypes.some(isMultipartContentType)) return 'FormData'
  if (operation.requestContentTypes.some(isFormUrlEncodedContentType)) return 'URLSearchParams'
  if (operation.requestContentTypes.some(isBinaryContentType))
    return 'Blob | ArrayBuffer | ReadableStream'
  return (
    resolveSchemaName(operation.requestBodySchema) ??
    schemaToTypeScript(normalized, operation.requestBodySchema, { mode: 'request' })
  )
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
  return (
    normalized === 'application/octet-stream' ||
    normalized === 'application/pdf' ||
    normalized.startsWith('image/')
  )
}

function createParamsInterface(
  normalized: NormalizedOpenApi,
  name: string,
  params: OpenApiParameter[],
): string {
  if (params.length === 0) {
    return `export type ${name} = Record<string, never>`
  }

  const lines = params.map((param) => {
    const optional = param.required ? '' : '?'
    return `  ${quoteObjectKeyIfNeeded(param.name)}${optional}: ${schemaToTypeScript(normalized, param.schema, { mode: 'request' })}`
  })

  return `export interface ${name} {\n${lines.join('\n')}\n}`
}

function createResponseDeclaration(
  normalized: NormalizedOpenApi,
  name: string,
  operation: NormalizedOperation | undefined,
): string {
  if (operation?.responseBodyEmpty) return `export type ${name} = void`
  const schema = operation?.responseSchema
  const schemaName = resolveSchemaName(schema)
  if (schemaName) return `export type ${name} = ${schemaName}`
  if (!schema) return `export type ${name} = unknown`

  const type = schemaToTypeScript(normalized, schema, { mode: 'response' })
  return type.startsWith('{') ? `export interface ${name} ${type}` : `export type ${name} = ${type}`
}

function createResponseType(
  normalized: NormalizedOpenApi,
  operation: NormalizedOperation | undefined,
  fallback: string,
): string {
  if (operation?.responseBodyEmpty) return 'void'
  const schema = operation?.responseSchema
  return (
    resolveSchemaName(schema) ??
    (schema ? schemaToTypeScript(normalized, schema, { mode: 'response' }) : fallback)
  )
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
