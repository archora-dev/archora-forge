import type { DetectedResource } from '../../resources/resources.types.js'
import { pluralizeTypeName } from '../identifiers.js'
import { createOperationTypeNames, getOperationParams, getPathParams } from '../typeGeneration.js'
import { createResourceTypeNames } from '../typeGeneration.js'

export function createListComposable(resourceName: string, resource: DetectedResource): string {
  const names = createResourceTypeNames(resource)
  const collection = pluralizeTypeName(resource.entity)
  if (!resource.operations.list?.id) return createMissingComposable(`use${collection}Query`)
  const requiresParams = getPathParams(resource.operations.list).length > 0
  return `import { ${resourceName}Client } from '../../../shared/api/generated/${resourceName}/${resourceName}.client'\nimport { ${resourceName}QueryKeys } from '../../../shared/api/generated/${resourceName}/${resourceName}.query-keys'\nimport type { ${names.listParamsType}, ${names.listResponseType} } from '../../../shared/api/generated/${resourceName}/${resourceName}.types'\n\nexport function use${collection}Query(params${requiresParams ? '' : '?'}: ${names.listParamsType}): Promise<${names.listResponseType}> {\n  ${resourceName}QueryKeys.list(params)\n  return ${resourceName}Client.${resource.operations.list.id}(params)\n}\n`
}

export function createDetailComposable(resourceName: string, resource: DetectedResource): string {
  const names = createResourceTypeNames(resource)
  if (!resource.operations.detail?.id) return createMissingComposable(`use${resource.entity}Query`)
  return `import { ${resourceName}Client } from '../../../shared/api/generated/${resourceName}/${resourceName}.client'\nimport { ${resourceName}QueryKeys } from '../../../shared/api/generated/${resourceName}/${resourceName}.query-keys'\nimport type { ${names.detailResponseType}, ${names.idType} } from '../../../shared/api/generated/${resourceName}/${resourceName}.types'\n\nexport function use${resource.entity}Query(id: ${names.idType}): Promise<${names.detailResponseType}> {\n  ${resourceName}QueryKeys.detail(id)\n  return ${resourceName}Client.${resource.operations.detail.id}(id)\n}\n`
}

export function createCreateMutation(resourceName: string, resource: DetectedResource): string {
  const names = createResourceTypeNames(resource)
  if (!resource.operations.create?.id) return createMissingComposable(`useCreate${resource.entity}Mutation`)
  const pathParams = getPathParams(resource.operations.create)
  if (pathParams.length > 0) {
    return `import { ${resourceName}Client } from '../../../shared/api/generated/${resourceName}/${resourceName}.client'\nimport { ${resourceName}QueryKeys } from '../../../shared/api/generated/${resourceName}/${resourceName}.query-keys'\nimport type { ${names.listParamsType}, ${names.createRequestType}, ${names.createResponseType} } from '../../../shared/api/generated/${resourceName}/${resourceName}.types'\n\nexport function useCreate${resource.entity}Mutation(): {\n  mutate: (input: { params: ${names.listParamsType}; payload: ${names.createRequestType} }) => Promise<${names.createResponseType}>\n  invalidate: (params: ${names.listParamsType}) => ReturnType<typeof ${resourceName}QueryKeys.list>\n} {\n  return {\n    mutate: (input) => ${resourceName}Client.${resource.operations.create.id}(input.params, input.payload),\n    invalidate: (params) => ${resourceName}QueryKeys.list(params),\n  }\n}\n`
  }
  return `import { ${resourceName}Client } from '../../../shared/api/generated/${resourceName}/${resourceName}.client'\nimport { ${resourceName}QueryKeys } from '../../../shared/api/generated/${resourceName}/${resourceName}.query-keys'\nimport type { ${names.createRequestType}, ${names.createResponseType} } from '../../../shared/api/generated/${resourceName}/${resourceName}.types'\n\nexport function useCreate${resource.entity}Mutation(): {\n  mutate: (payload: ${names.createRequestType}) => Promise<${names.createResponseType}>\n  invalidate: () => ReturnType<typeof ${resourceName}QueryKeys.list>\n} {\n  return {\n    mutate: (payload: ${names.createRequestType}) => ${resourceName}Client.${resource.operations.create.id}(payload),\n    invalidate: () => ${resourceName}QueryKeys.list(),\n  }\n}\n`
}

export function createUpdateMutation(resourceName: string, resource: DetectedResource): string {
  const names = createResourceTypeNames(resource)
  if (!resource.operations.update?.id) return createMissingComposable(`useUpdate${resource.entity}Mutation`)
  return `import { ${resourceName}Client } from '../../../shared/api/generated/${resourceName}/${resourceName}.client'\nimport { ${resourceName}QueryKeys } from '../../../shared/api/generated/${resourceName}/${resourceName}.query-keys'\nimport type { ${names.idType}, ${names.updateRequestType}, ${names.updateResponseType} } from '../../../shared/api/generated/${resourceName}/${resourceName}.types'\n\nexport function useUpdate${resource.entity}Mutation(): {\n  mutate: (input: { id: ${names.idType}; payload: ${names.updateRequestType} }) => Promise<${names.updateResponseType}>\n  invalidate: (id: ${names.idType}) => ReturnType<typeof ${resourceName}QueryKeys.detail>\n} {\n  return {\n    mutate: ({ id, payload }) => ${resourceName}Client.${resource.operations.update.id}(id, payload),\n    invalidate: (id) => ${resourceName}QueryKeys.detail(id),\n  }\n}\n`
}

export function createDeleteMutation(resourceName: string, resource: DetectedResource): string {
  const names = createResourceTypeNames(resource)
  if (!resource.operations.delete?.id) return createMissingComposable(`useDelete${resource.entity}Mutation`)
  const requiresListParams = getPathParams(resource.operations.delete).length > 1
  if (requiresListParams) {
    return `import { ${resourceName}Client } from '../../../shared/api/generated/${resourceName}/${resourceName}.client'\nimport { ${resourceName}QueryKeys } from '../../../shared/api/generated/${resourceName}/${resourceName}.query-keys'\nimport type { ${names.idType} } from '../../../shared/api/generated/${resourceName}/${resourceName}.types'\n\nexport function useDelete${resource.entity}Mutation(): {\n  mutate: (id: ${names.idType}) => Promise<void>\n  invalidate: (id: ${names.idType}) => ReturnType<typeof ${resourceName}QueryKeys.detail>\n} {\n  return {\n    mutate: (id) => ${resourceName}Client.${resource.operations.delete.id}(id),\n    invalidate: (id) => ${resourceName}QueryKeys.detail(id),\n  }\n}\n`
  }
  return `import { ${resourceName}Client } from '../../../shared/api/generated/${resourceName}/${resourceName}.client'\nimport { ${resourceName}QueryKeys } from '../../../shared/api/generated/${resourceName}/${resourceName}.query-keys'\nimport type { ${names.idType} } from '../../../shared/api/generated/${resourceName}/${resourceName}.types'\n\nexport function useDelete${resource.entity}Mutation(): {\n  mutate: (id: ${names.idType}) => Promise<void>\n  invalidate: () => ReturnType<typeof ${resourceName}QueryKeys.list>\n} {\n  return {\n    mutate: (id) => ${resourceName}Client.${resource.operations.delete.id}(id),\n    invalidate: () => ${resourceName}QueryKeys.list(),\n  }\n}\n`
}

export function createOperationComposable(
  resourceName: string,
  operation: DetectedResource['operationsList'][number],
): string {
  const names = createOperationTypeNames(operation)
  const composableName = operationComposableName(operation)
  const hasPayload = Boolean(operation.requestBodySchema)
  const hasParams = getOperationParams(operation).length > 0
  const imports = [
    ...(hasPayload ? [names.requestType] : []),
    ...(hasParams ? [names.paramsType] : []),
    names.responseType,
  ]

  return `import { ${resourceName}Client } from '../../../shared/api/generated/${resourceName}/${resourceName}.client'\nimport type { ${imports.join(', ')} } from '../../../shared/api/generated/${resourceName}/${resourceName}.types'\n\ntype ${toInputTypeName(operation)} = ${operationInputType(names, hasPayload, hasParams)}\n\nexport function ${composableName}(): {\n  mutate: (input: ${toInputTypeName(operation)}) => Promise<${names.responseType}>\n} {\n  return {\n    mutate: (input) => ${operationClientCall(resourceName, operation, hasPayload, hasParams, true)},\n  }\n}\n`
}

export function operationComposableName(operation: DetectedResource['operationsList'][number]): string {
  const operationName = createOperationTypeNames(operation).requestType.replace(/OperationRequest$/, '')
  return `use${operationName}${operation.method === 'get' ? 'Query' : 'Mutation'}`
}

function createMissingComposable(name: string): string {
  return `export function ${name}(): never {\n  throw new Error('${name} is not available: missing OpenAPI operation for this resource.')\n}\n`
}

function toInputTypeName(operation: DetectedResource['operationsList'][number]): string {
  return `${createOperationTypeNames(operation).requestType.replace(/Request$/, '')}Input`
}

function operationInputType(names: ReturnType<typeof createOperationTypeNames>, hasPayload: boolean, hasParams: boolean): string {
  if (hasPayload && hasParams) return `{ payload: ${names.requestType}; params: ${names.paramsType} }`
  if (hasPayload) return names.requestType
  if (hasParams) return names.paramsType
  return 'void'
}

function operationClientCall(
  resourceName: string,
  operation: DetectedResource['operationsList'][number],
  hasPayload: boolean,
  hasParams: boolean,
  fromInput: boolean,
): string {
  const target = `${resourceName}Client.${operation.id}`
  if (hasPayload && hasParams) return `${target}(${fromInput ? 'input.payload, input.params' : 'payload, params'})`
  if (hasPayload) return `${target}(${fromInput ? 'input' : 'payload'})`
  if (hasParams) return `${target}(${fromInput ? 'input' : 'params'})`
  return `${target}()`
}
