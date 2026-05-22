import type { NormalizedOpenApi } from '../../openapi/openapi.types.js'
import { hasPathParameters, renderPathTemplate } from '../../openapi/pathTemplate.js'
import type { DetectedResource } from '../../resources/resources.types.js'
import { pluralizeTypeName, quoteObjectKeyIfNeeded, toSafeIdentifier, toSafeTypeName } from '../identifiers.js'
import {
  createResourceTypeNames,
  createOperationTypeNames,
  getHeaderParams,
  getOperationParams,
  getPathParams,
  getQueryParams,
} from '../typeGeneration.js'

export function createClientArtifact(normalized: NormalizedOpenApi, resourceName: string, resource: DetectedResource): string {
  const names = createResourceTypeNames(resource)
  const requestOptionsType = `${toSafeTypeName(resource.name)}RequestOptions`
  const signatures: string[] = []
  const implementations: string[] = []

  if (resource.operations.list?.id) {
    const response = resource.operations.list.responseSchema || resource.operations.list.responseBodyEmpty ? names.listResponseType : 'unknown'
    const pathParams = getPathParams(resource.operations.list)
    const queryParams = getQueryParams(resource.operations.list)
    const requiresParams = pathParams.length > 0
    signatures.push(`  ${resource.operations.list.id}: (params${requiresParams ? '' : '?'}: ${names.listParamsType}, options?: ${requestOptionsType}) => Promise<${response}>`)
    implementations.push(
      `  ${resource.operations.list.id}: (params, options) => apiClient.request<${response}>('GET', ${pathWithParamsObject(resource.operations.list.path)}${createListRequestOptions(queryParams, requiresParams)}),`,
    )
  }
  if (resource.operations.detail?.id) {
    const response = names.detailResponseType
    const pathParams = getPathParams(resource.operations.detail)
    const paramSignature = createPathParamSignature(pathParams, names.idType)
    const paramName = pathParams.length > 1 ? 'params' : toSafeIdentifier(pathParams[0]?.name ?? 'id')
    signatures.push(`  ${resource.operations.detail.id}: (${paramName}: ${paramSignature}, options?: ${requestOptionsType}) => Promise<${response}>`)
    implementations.push(
      `  ${resource.operations.detail.id}: (${paramName}, options) => apiClient.request<${response}>('GET', ${pathWithParams(resource.operations.detail.path, pathParams)}, options),`,
    )
  }
  if (resource.operations.create?.id) {
    const response = names.createResponseType
    const pathParams = getPathParams(resource.operations.create)
    if (pathParams.length > 0) {
      signatures.push(`  ${resource.operations.create.id}: (params: ${names.listParamsType}, payload: ${names.createRequestType}, options?: ${requestOptionsType}) => Promise<${response}>`)
      implementations.push(
        `  ${resource.operations.create.id}: (params, payload, options) => apiClient.request<${response}>('POST', ${pathWithParamsObject(resource.operations.create.path)}, { ...options, body: payload }),`,
      )
    } else {
      signatures.push(`  ${resource.operations.create.id}: (payload: ${names.createRequestType}, options?: ${requestOptionsType}) => Promise<${response}>`)
      implementations.push(
        `  ${resource.operations.create.id}: (payload, options) => apiClient.request<${response}>('POST', '${resource.operations.create.path}', { ...options, body: payload }),`,
      )
    }
  }
  if (resource.operations.update?.id) {
    const response = names.updateResponseType
    const pathParams = getPathParams(resource.operations.update)
    const paramSignature = createPathParamSignature(pathParams, names.idType)
    const paramName = pathParams.length > 1 ? 'params' : toSafeIdentifier(pathParams[0]?.name ?? 'id')
    signatures.push(`  ${resource.operations.update.id}: (${paramName}: ${paramSignature}, payload: ${names.updateRequestType}, options?: ${requestOptionsType}) => Promise<${response}>`)
    implementations.push(
      `  ${resource.operations.update.id}: (${paramName}, payload, options) => apiClient.request<${response}>('PATCH', ${pathWithParams(resource.operations.update.path, pathParams)}, { ...options, body: payload }),`,
    )
  }
  if (resource.operations.delete?.id) {
    const pathParams = getPathParams(resource.operations.delete)
    const paramSignature = createPathParamSignature(pathParams, names.idType)
    const paramName = pathParams.length > 1 ? 'params' : toSafeIdentifier(pathParams[0]?.name ?? 'id')
    signatures.push(`  ${resource.operations.delete.id}: (${paramName}: ${paramSignature}, options?: ${requestOptionsType}) => Promise<void>`)
    implementations.push(
      `  ${resource.operations.delete.id}: (${paramName}, options) => apiClient.request<void>('DELETE', ${pathWithParams(resource.operations.delete.path, pathParams)}, options),`,
    )
  }
  for (const operation of resource.operationsList.filter((item) => isGeneratedOperation(resource, item))) {
    const names = createOperationTypeNames(operation)
    const response = names.responseType
    const params = getOperationParams(operation)
    const queryParams = getQueryParams(operation)
    const headerParams = getHeaderParams(operation)
    const method = operation.method.toUpperCase()
    const pathExpression = pathWithOperationParams(operation.path)
    const options = createOperationRequestOptions(operation.requestBodySchema ? 'payload' : null, queryParams, headerParams)

    signatures.push(`  ${operation.id}: ${createOperationSignature(names, Boolean(operation.requestBodySchema), params.length > 0, response, requestOptionsType)}`)
    implementations.push(`  ${operation.id}: ${createOperationImplementationArgs(Boolean(operation.requestBodySchema), params.length > 0)} => apiClient.request<${response}>('${method}', ${pathExpression}${options}),`)
  }

  const imports = collectClientTypes(resource)
  const typeImport = imports.length > 0 ? `import type { ${imports.join(', ')} } from './${resourceName}.types'\n\n` : ''
  const runtimeImports = ['createApiClient', ...(usesQueryParamWrapper(resource) ? ['queryParam'] : [])]
  const entityCollectionName = pluralizeTypeName(resource.entity)
  const configureName = `configure${entityCollectionName}Client`
  const setName = `set${entityCollectionName}Client`
  const operationHeaderHelper = resource.operationsList.filter((operation) => isGeneratedOperation(resource, operation)).some((operation) => getHeaderParams(operation).length > 0)
    ? `\nfunction createOperationHeaders(base: Record<string, string> | undefined, params: Record<string, unknown>): Record<string, string> {\n  const headers = { ...(base ?? {}) }\n  for (const [key, value] of Object.entries(params)) {\n    if (value !== undefined && value !== null) headers[key] = String(value)\n  }\n  return headers\n}\n`
    : ''

  return `import { ${runtimeImports.join(', ')}, type ApiClient, type ApiClientOptions, type ApiRequestOptions } from '@archora/forge-runtime'\n${typeImport}export type ${requestOptionsType} = Omit<ApiRequestOptions, 'body' | 'params'>\n\nlet apiClient = createApiClient({ baseUrl: '' })\n\nexport function ${configureName}(options: ApiClientOptions): void {\n  apiClient = createApiClient(options)\n}\n\nexport function ${setName}(client: ApiClient): void {\n  apiClient = client\n}\n\nexport const ${resourceName}Client: {\n${signatures.join('\n')}\n} = {\n${implementations.join('\n')}\n}\n${operationHeaderHelper}`
}

function collectClientTypes(resource: DetectedResource): string[] {
  const names = createResourceTypeNames(resource)
  const types = new Set<string>()
  if (resource.operations.list?.id) {
    types.add(names.listParamsType)
    if (resource.operations.list.responseSchema || resource.operations.list.responseBodyEmpty) types.add(names.listResponseType)
  }
  if (resource.operations.detail?.id) {
    types.add(names.idType)
    types.add(names.detailResponseType)
  }
  if (resource.operations.create?.id) {
    if (!resource.operations.list?.id && getPathParams(resource.operations.create).length > 0) types.add(names.listParamsType)
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
  for (const operation of resource.operationsList.filter((item) => isGeneratedOperation(resource, item))) {
    const operationNames = createOperationTypeNames(operation)
    if (getOperationParams(operation).length > 0) types.add(operationNames.paramsType)
    if (operation.requestBodySchema) types.add(operationNames.requestType)
    types.add(operationNames.responseType)
  }

  return [...types]
}

function createPathParamSignature(params: ReturnType<typeof getPathParams>, singleType: string): string {
  return params.length <= 1 ? singleType : singleType
}

function pathWithParams(path: string, params: ReturnType<typeof getPathParams>): string {
  if (params.length <= 1) {
    const paramName = toSafeIdentifier(params[0]?.name ?? 'id')
    return `\`${renderPathTemplate(path, () => `\${${encodePathParam(paramName)}}`)}\``
  }
  return `\`${renderPathTemplate(path, (name) => `\${${encodePathParam(paramValueAccess('params', name))}}`)}\``
}

function pathWithParamsObject(path: string): string {
  return `\`${renderPathTemplate(path, (name) => `\${${encodePathParam(paramValueAccess('params', name))}}`)}\``
}

function isGeneratedOperation(resource: DetectedResource, operation: DetectedResource['operationsList'][number]): boolean {
  return operation.operationKind !== 'unsupported-operation' && Boolean(operation.id) && !Object.values(resource.operations).includes(operation)
}

function createOperationSignature(
  names: ReturnType<typeof createOperationTypeNames>,
  hasPayload: boolean,
  hasParams: boolean,
  response: string,
  requestOptionsType: string,
): string {
  if (hasPayload && hasParams) return `(payload: ${names.requestType}, params: ${names.paramsType}, options?: ${requestOptionsType}) => Promise<${response}>`
  if (hasPayload) return `(payload: ${names.requestType}, options?: ${requestOptionsType}) => Promise<${response}>`
  if (hasParams) return `(params: ${names.paramsType}, options?: ${requestOptionsType}) => Promise<${response}>`
  return `(options?: ${requestOptionsType}) => Promise<${response}>`
}

function createOperationImplementationArgs(hasPayload: boolean, hasParams: boolean): string {
  if (hasPayload && hasParams) return '(payload, params, options)'
  if (hasPayload) return '(payload, options)'
  if (hasParams) return '(params, options)'
  return '(options)'
}

function createOperationRequestOptions(
  payloadName: string | null,
  queryParams: ReturnType<typeof getQueryParams>,
  headerParams: ReturnType<typeof getHeaderParams>,
): string {
  const options: string[] = []
  options.push('...options')
  if (payloadName) options.push(`body: ${payloadName}`)
  if (queryParams.length > 0) {
    options.push(`params: ${createQueryParamsObject(queryParams, false)}`)
  }
  if (headerParams.length > 0) {
    options.push(`headers: createOperationHeaders(options?.headers, { ${headerParams.map((param) => `${quoteObjectKeyIfNeeded(param.name)}: ${paramValueAccess('params', param.name)}`).join(', ')} })`)
  }
  return options.length > 1 ? `, { ${options.join(', ')} }` : ', options'
}

function createListRequestOptions(queryParams: ReturnType<typeof getQueryParams>, requiresParams: boolean): string {
  if (queryParams.length === 0) return ', options'
  if (!requiresParams && !queryParams.some(requiresQueryParamWrapper)) return ', { ...options, params: params as Record<string, unknown> | undefined }'
  return `, { ...options, params: ${createQueryParamsObject(queryParams, !requiresParams)} }`
}

function pathWithOperationParams(path: string): string {
  if (!hasPathParameters(path)) return `'${path}'`
  return `\`${renderPathTemplate(path, (name) => `\${${encodePathParam(paramValueAccess('params', name))}}`)}\``
}

function encodePathParam(expression: string): string {
  return `encodeURIComponent(String(${expression}))`
}

function paramValueAccess(objectName: string, paramName: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(paramName) ? `${objectName}.${paramName}` : `${objectName}[${JSON.stringify(paramName)}]`
}

function createQueryParamsObject(queryParams: ReturnType<typeof getQueryParams>, optionalParams: boolean): string {
  return `{ ${queryParams.map((param) => `${quoteObjectKeyIfNeeded(param.name)}: ${queryParamValue(param, optionalParams)}`).join(', ')} }`
}

function queryParamValue(param: ReturnType<typeof getQueryParams>[number], optionalParams: boolean): string {
  const access = optionalParams ? optionalParamValueAccess('params', param.name) : paramValueAccess('params', param.name)
  if (!requiresQueryParamWrapper(param)) return access
  return `queryParam(${access}, { style: 'form', explode: false })`
}

function optionalParamValueAccess(objectName: string, paramName: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(paramName) ? `${objectName}?.${paramName}` : `${objectName}?.[${JSON.stringify(paramName)}]`
}

function requiresQueryParamWrapper(param: ReturnType<typeof getQueryParams>[number]): boolean {
  return param.in === 'query' && param.schema?.type === 'array' && (param.style ?? 'form') === 'form' && param.explode === false
}

function usesQueryParamWrapper(resource: DetectedResource): boolean {
  return resource.operationsList.some((operation) => getQueryParams(operation).some(requiresQueryParamWrapper))
}
