import type { NormalizedOpenApi } from '../../openapi/openapi.types.js'
import type { DetectedResource } from '../../resources/resources.types.js'
import { toSafeIdentifier } from '../identifiers.js'
import {
  createResourceTypeNames,
  createOperationTypeNames,
  getOperationParams,
  getPathParams,
  getQueryParams,
  schemaToTypeScript,
} from '../typeGeneration.js'

export function createClientArtifact(normalized: NormalizedOpenApi, resourceName: string, resource: DetectedResource): string {
  const names = createResourceTypeNames(resource)
  const signatures: string[] = []
  const implementations: string[] = []

  if (resource.operations.list?.id) {
    const response = resource.operations.list.responseSchema ? names.listResponseType : 'unknown'
    signatures.push(`  ${resource.operations.list.id}: (params?: ${names.listParamsType}) => Promise<${response}>`)
    implementations.push(
      `  ${resource.operations.list.id}: (params) => apiClient.request<${response}>('GET', '${resource.operations.list.path}', { params: params as Record<string, unknown> | undefined }),`,
    )
  }
  if (resource.operations.detail?.id) {
    const response = names.detailResponseType
    const pathParams = getPathParams(resource.operations.detail)
    const paramSignature = createPathParamSignature(normalized, pathParams, names.idType)
    const paramName = pathParams.length > 1 ? 'params' : toSafeIdentifier(pathParams[0]?.name ?? 'id')
    signatures.push(`  ${resource.operations.detail.id}: (${paramName}: ${paramSignature}) => Promise<${response}>`)
    implementations.push(
      `  ${resource.operations.detail.id}: (${paramName}) => apiClient.request<${response}>('GET', ${pathWithParams(resource.operations.detail.path, pathParams)}),`,
    )
  }
  if (resource.operations.create?.id) {
    const response = names.createResponseType
    signatures.push(`  ${resource.operations.create.id}: (payload: ${names.createRequestType}) => Promise<${response}>`)
    implementations.push(
      `  ${resource.operations.create.id}: (payload) => apiClient.request<${response}>('POST', '${resource.operations.create.path}', { body: payload }),`,
    )
  }
  if (resource.operations.update?.id) {
    const response = names.updateResponseType
    const pathParams = getPathParams(resource.operations.update)
    const paramSignature = createPathParamSignature(normalized, pathParams, names.idType)
    const paramName = pathParams.length > 1 ? 'params' : toSafeIdentifier(pathParams[0]?.name ?? 'id')
    signatures.push(`  ${resource.operations.update.id}: (${paramName}: ${paramSignature}, payload: ${names.updateRequestType}) => Promise<${response}>`)
    implementations.push(
      `  ${resource.operations.update.id}: (${paramName}, payload) => apiClient.request<${response}>('PATCH', ${pathWithParams(resource.operations.update.path, pathParams)}, { body: payload }),`,
    )
  }
  if (resource.operations.delete?.id) {
    const pathParams = getPathParams(resource.operations.delete)
    const paramSignature = createPathParamSignature(normalized, pathParams, names.idType)
    const paramName = pathParams.length > 1 ? 'params' : toSafeIdentifier(pathParams[0]?.name ?? 'id')
    signatures.push(`  ${resource.operations.delete.id}: (${paramName}: ${paramSignature}) => Promise<void>`)
    implementations.push(
      `  ${resource.operations.delete.id}: (${paramName}) => apiClient.request<void>('DELETE', ${pathWithParams(resource.operations.delete.path, pathParams)}),`,
    )
  }
  for (const operation of resource.operationsList.filter(isGeneratedOperation)) {
    const names = createOperationTypeNames(operation)
    const response = names.responseType
    const params = getOperationParams(operation)
    const queryParams = getQueryParams(operation)
    const method = operation.method.toUpperCase()
    const pathExpression = pathWithOperationParams(operation.path)
    const options = createOperationRequestOptions(operation.requestBodySchema ? 'payload' : null, params.length > 0, queryParams.length > 0)

    signatures.push(`  ${operation.id}: ${createOperationSignature(names, Boolean(operation.requestBodySchema), params.length > 0, response)}`)
    implementations.push(`  ${operation.id}: ${createOperationImplementationArgs(Boolean(operation.requestBodySchema), params.length > 0)} => apiClient.request<${response}>('${method}', ${pathExpression}${options}),`)
  }

  const imports = collectClientTypes(resource)
  const typeImport = imports.length > 0 ? `import type { ${imports.join(', ')} } from './${resourceName}.types'\n\n` : ''

  return `import { createApiClient } from '@archora/forge-runtime'\n${typeImport}const apiClient = createApiClient({ baseUrl: '' })\n\nexport const ${resourceName}Client: {\n${signatures.join('\n')}\n} = {\n${implementations.join('\n')}\n}\n`
}

function collectClientTypes(resource: DetectedResource): string[] {
  const names = createResourceTypeNames(resource)
  const types = new Set<string>()
  if (resource.operations.list?.id) {
    types.add(names.listParamsType)
    if (resource.operations.list.responseSchema) types.add(names.listResponseType)
  }
  if (resource.operations.detail?.id) {
    types.add(names.idType)
    types.add(names.detailResponseType)
  }
  if (resource.operations.create?.id) {
    types.add(names.createRequestType)
    types.add(names.createResponseType)
  }
  if (resource.operations.update?.id) {
    types.add(names.idType)
    types.add(names.updateRequestType)
    types.add(names.updateResponseType)
  }
  if (resource.operations.delete?.id) {
    types.add(names.idType)
  }
  for (const operation of resource.operationsList.filter(isGeneratedOperation)) {
    const operationNames = createOperationTypeNames(operation)
    if (getOperationParams(operation).length > 0) types.add(operationNames.paramsType)
    if (operation.requestBodySchema) types.add(operationNames.requestType)
    types.add(operationNames.responseType)
  }

  return [...types]
}

function createPathParamSignature(normalized: NormalizedOpenApi, params: ReturnType<typeof getPathParams>, singleType: string): string {
  if (params.length <= 1) {
    return singleType
  }
  return `{ ${params.map((param) => `${toSafeIdentifier(param.name)}: ${schemaToTypeScript(normalized, param.schema, { mode: 'request' })}`).join('; ')} }`
}

function pathWithParams(path: string, params: ReturnType<typeof getPathParams>): string {
  if (params.length <= 1) {
    const paramName = toSafeIdentifier(params[0]?.name ?? 'id')
    return `\`${path.replace(/\{[^}]+\}/g, `\${${paramName}}`)}\``
  }
  return `\`${path.replace(/\{([^}]+)\}/g, (_, name: string) => `\${params.${toSafeIdentifier(name)}}`)}\``
}

function isGeneratedOperation(operation: DetectedResource['operationsList'][number]): boolean {
  return operation.operationKind !== 'crud-resource' && operation.operationKind !== 'unsupported-operation' && Boolean(operation.id)
}

function createOperationSignature(names: ReturnType<typeof createOperationTypeNames>, hasPayload: boolean, hasParams: boolean, response: string): string {
  if (hasPayload && hasParams) return `(payload: ${names.requestType}, params: ${names.paramsType}) => Promise<${response}>`
  if (hasPayload) return `(payload: ${names.requestType}) => Promise<${response}>`
  if (hasParams) return `(params: ${names.paramsType}) => Promise<${response}>`
  return `() => Promise<${response}>`
}

function createOperationImplementationArgs(hasPayload: boolean, hasParams: boolean): string {
  if (hasPayload && hasParams) return '(payload, params)'
  if (hasPayload) return '(payload)'
  if (hasParams) return '(params)'
  return '()'
}

function createOperationRequestOptions(payloadName: string | null, hasParams: boolean, hasQueryParams: boolean): string {
  const options: string[] = []
  if (payloadName) options.push(`body: ${payloadName}`)
  if (hasParams && hasQueryParams) options.push('params: params as Record<string, unknown>')
  return options.length > 0 ? `, { ${options.join(', ')} }` : ''
}

function pathWithOperationParams(path: string): string {
  if (!/\{[^}]+\}/.test(path)) return `'${path}'`
  return `\`${path.replace(/\{([^}]+)\}/g, (_, name: string) => `\${params.${toSafeIdentifier(name)}}`)}\``
}
