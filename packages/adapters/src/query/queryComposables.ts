import {
  createOperationTypeNames,
  createResourceTypeNames,
  getOperationParams,
  getPathParams,
  operationComposableName,
  pluralizeTypeName,
  type ComposableGenerators,
  type ComposableOperation,
  type DetectedResource,
} from '@archora/forge-core'

/**
 * Builds a {@link ComposableGenerators} set that emits real TanStack Query hooks
 * (`useQuery` / `useMutation`) wired to the framework-neutral client and query
 * keys produced by the core. The only difference between the React and Vue
 * variants is the package the generated code imports from, so both are produced
 * by the same builder.
 *
 * The hooks reference `@tanstack/react-query` or `@tanstack/vue-query` as a peer
 * dependency of the consumer's project — this package never imports them, it only
 * emits source text, keeping the toolchain framework-neutral.
 */
export type QueryComposableTarget = 'tanstack-query' | 'vue-query'

/** Real React hooks built on `@tanstack/react-query`. */
export const tanstackQueryComposables: ComposableGenerators =
  createQueryComposables('@tanstack/react-query')

/** Real Vue composables built on `@tanstack/vue-query`. */
export const vueQueryComposables: ComposableGenerators =
  createQueryComposables('@tanstack/vue-query')

/**
 * Resolves the composable generators for a `target.query` value. Returns
 * `undefined` for the neutral `promise` target (and anything unknown) so the core
 * falls back to its framework-free default.
 */
export function resolveQueryComposables(
  target: string | undefined,
): ComposableGenerators | undefined {
  if (target === 'tanstack-query') return tanstackQueryComposables
  if (target === 'vue-query') return vueQueryComposables
  return undefined
}

export function createQueryComposables(queryModule: string): ComposableGenerators {
  return {
    list: (resourceName, resource) => listHook(queryModule, resourceName, resource),
    detail: (resourceName, resource) => detailHook(queryModule, resourceName, resource),
    createMutation: (resourceName, resource) =>
      createMutationHook(queryModule, resourceName, resource),
    updateMutation: (resourceName, resource) =>
      updateMutationHook(queryModule, resourceName, resource),
    deleteMutation: (resourceName, resource) =>
      deleteMutationHook(queryModule, resourceName, resource),
    operation: (resourceName, operation) => operationHook(queryModule, resourceName, operation),
  }
}

function importPaths(resourceName: string): { client: string; keys: string; types: string } {
  const base = `../../../shared/api/generated/${resourceName}/${resourceName}`
  return { client: `${base}.client`, keys: `${base}.query-keys`, types: `${base}.types` }
}

function clientName(resourceName: string): string {
  return `${resourceName}Client`
}

function keysName(resourceName: string): string {
  return `${resourceName}QueryKeys`
}

function missingHook(name: string): string {
  return `export function ${name}(): never {\n  throw new Error('${name} is not available: missing OpenAPI operation for this resource.')\n}\n`
}

/**
 * Default cache invalidation handler. It is declared before the `...options`
 * spread so a caller-supplied `onSuccess` overrides it — the option types differ
 * between React and Vue Query, so merging the two handlers is not portable.
 */
function invalidateOnSuccess(invalidation: string, usesVariables: boolean): string {
  const signature = usesVariables ? '(_data, variables)' : '()'
  return `onSuccess: ${signature} => {
      queryClient.invalidateQueries({ queryKey: ${invalidation} })
    },`
}

function listHook(queryModule: string, resourceName: string, resource: DetectedResource): string {
  const collection = pluralizeTypeName(resource.entity)
  if (!resource.operations.list?.id) return missingHook(`use${collection}Query`)
  const names = createResourceTypeNames(resource)
  const paths = importPaths(resourceName)
  const requiresParams = getPathParams(resource.operations.list).length > 0
  return `import { useQuery, type UseQueryOptions } from '${queryModule}'
import { ${clientName(resourceName)} } from '${paths.client}'
import { ${keysName(resourceName)} } from '${paths.keys}'
import type { ${names.listParamsType}, ${names.listResponseType} } from '${paths.types}'

export function use${collection}Query(
  params${requiresParams ? '' : '?'}: ${names.listParamsType},
  options?: Omit<UseQueryOptions<${names.listResponseType}>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: ${keysName(resourceName)}.list(params),
    queryFn: () => ${clientName(resourceName)}.${resource.operations.list.id}(params),
    ...options,
  })
}
`
}

function detailHook(queryModule: string, resourceName: string, resource: DetectedResource): string {
  if (!resource.operations.detail?.id) return missingHook(`use${resource.entity}Query`)
  const names = createResourceTypeNames(resource)
  const paths = importPaths(resourceName)
  return `import { useQuery, type UseQueryOptions } from '${queryModule}'
import { ${clientName(resourceName)} } from '${paths.client}'
import { ${keysName(resourceName)} } from '${paths.keys}'
import type { ${names.detailResponseType}, ${names.idType} } from '${paths.types}'

export function use${resource.entity}Query(
  id: ${names.idType},
  options?: Omit<UseQueryOptions<${names.detailResponseType}>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: ${keysName(resourceName)}.detail(id),
    queryFn: () => ${clientName(resourceName)}.${resource.operations.detail.id}(id),
    ...options,
  })
}
`
}

function createMutationHook(
  queryModule: string,
  resourceName: string,
  resource: DetectedResource,
): string {
  if (!resource.operations.create?.id) return missingHook(`useCreate${resource.entity}Mutation`)
  const names = createResourceTypeNames(resource)
  const paths = importPaths(resourceName)
  const hasPathParams = getPathParams(resource.operations.create).length > 0

  const inputType = hasPathParams
    ? `{ params: ${names.listParamsType}; payload: ${names.createRequestType} }`
    : names.createRequestType
  const callArgs = hasPathParams ? 'input.params, input.payload' : 'input'
  const invalidation = hasPathParams
    ? `${keysName(resourceName)}.list(variables.params)`
    : `${keysName(resourceName)}.list()`
  const typeImports = hasPathParams
    ? `${names.createRequestType}, ${names.createResponseType}, ${names.listParamsType}`
    : `${names.createRequestType}, ${names.createResponseType}`

  return `import { useMutation, useQueryClient, type UseMutationOptions } from '${queryModule}'
import { ${clientName(resourceName)} } from '${paths.client}'
import { ${keysName(resourceName)} } from '${paths.keys}'
import type { ${typeImports} } from '${paths.types}'

export function useCreate${resource.entity}Mutation(
  options?: Omit<UseMutationOptions<${names.createResponseType}, Error, ${inputType}>, 'mutationFn'>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ${inputType}) => ${clientName(resourceName)}.${resource.operations.create.id}(${callArgs}),
    ${invalidateOnSuccess(invalidation, hasPathParams)}
    ...options,
  })
}
`
}

function updateMutationHook(
  queryModule: string,
  resourceName: string,
  resource: DetectedResource,
): string {
  if (!resource.operations.update?.id) return missingHook(`useUpdate${resource.entity}Mutation`)
  const names = createResourceTypeNames(resource)
  const paths = importPaths(resourceName)
  const inputType = `{ id: ${names.idType}; payload: ${names.updateRequestType} }`

  return `import { useMutation, useQueryClient, type UseMutationOptions } from '${queryModule}'
import { ${clientName(resourceName)} } from '${paths.client}'
import { ${keysName(resourceName)} } from '${paths.keys}'
import type { ${names.idType}, ${names.updateRequestType}, ${names.updateResponseType} } from '${paths.types}'

export function useUpdate${resource.entity}Mutation(
  options?: Omit<UseMutationOptions<${names.updateResponseType}, Error, ${inputType}>, 'mutationFn'>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ${inputType}) => ${clientName(resourceName)}.${resource.operations.update.id}(input.id, input.payload),
    ${invalidateOnSuccess(`${keysName(resourceName)}.detail(variables.id)`, true)}
    ...options,
  })
}
`
}

function deleteMutationHook(
  queryModule: string,
  resourceName: string,
  resource: DetectedResource,
): string {
  if (!resource.operations.delete?.id) return missingHook(`useDelete${resource.entity}Mutation`)
  const names = createResourceTypeNames(resource)
  const paths = importPaths(resourceName)
  const invalidatesDetail = getPathParams(resource.operations.delete).length > 1
  const invalidation = invalidatesDetail
    ? `${keysName(resourceName)}.detail(variables)`
    : `${keysName(resourceName)}.list()`
  const onSuccess = invalidateOnSuccess(invalidation, invalidatesDetail)

  return `import { useMutation, useQueryClient, type UseMutationOptions } from '${queryModule}'
import { ${clientName(resourceName)} } from '${paths.client}'
import { ${keysName(resourceName)} } from '${paths.keys}'
import type { ${names.idType} } from '${paths.types}'

export function useDelete${resource.entity}Mutation(
  options?: Omit<UseMutationOptions<void, Error, ${names.idType}>, 'mutationFn'>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: ${names.idType}) => ${clientName(resourceName)}.${resource.operations.delete.id}(id),
    ${onSuccess}
    ...options,
  })
}
`
}

function operationHook(
  queryModule: string,
  resourceName: string,
  operation: ComposableOperation,
): string {
  const names = createOperationTypeNames(operation)
  const hookName = operationComposableName(operation)
  const paths = importPaths(resourceName)
  const hasPayload = Boolean(operation.requestBodySchema)
  const hasParams = getOperationParams(operation).length > 0
  const isQuery = operation.method === 'get'

  const inputType = operationInputType(names, hasPayload, hasParams)
  const hasInput = inputType !== 'void'
  const callArgs = operationCallArgs(hasPayload, hasParams)
  const typeImports = [
    ...(hasPayload ? [names.requestType] : []),
    ...(hasParams ? [names.paramsType] : []),
    names.responseType,
  ].join(', ')

  if (isQuery) {
    const keyEntries = hasInput
      ? `[...${keysName(resourceName)}.all, '${operation.id}', input]`
      : `[...${keysName(resourceName)}.all, '${operation.id}']`
    return `import { useQuery, type UseQueryOptions } from '${queryModule}'
import { ${clientName(resourceName)} } from '${paths.client}'
import { ${keysName(resourceName)} } from '${paths.keys}'
import type { ${typeImports} } from '${paths.types}'

export function ${hookName}(
${hasInput ? `  input: ${inputType},\n` : ''}  options?: Omit<UseQueryOptions<${names.responseType}>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: ${keyEntries},
    queryFn: () => ${clientName(resourceName)}.${operation.id}(${callArgs}),
    ...options,
  })
}
`
  }

  return `import { useMutation, type UseMutationOptions } from '${queryModule}'
import { ${clientName(resourceName)} } from '${paths.client}'
import type { ${typeImports} } from '${paths.types}'

export function ${hookName}(
  options?: Omit<UseMutationOptions<${names.responseType}, Error, ${inputType}>, 'mutationFn'>,
) {
  return useMutation({
    mutationFn: (${hasInput ? `input: ${inputType}` : ''}) => ${clientName(resourceName)}.${operation.id}(${callArgs}),
    ...options,
  })
}
`
}

function operationInputType(
  names: ReturnType<typeof createOperationTypeNames>,
  hasPayload: boolean,
  hasParams: boolean,
): string {
  if (hasPayload && hasParams)
    return `{ payload: ${names.requestType}; params: ${names.paramsType} }`
  if (hasPayload) return names.requestType
  if (hasParams) return names.paramsType
  return 'void'
}

function operationCallArgs(hasPayload: boolean, hasParams: boolean): string {
  if (hasPayload && hasParams) return 'input.payload, input.params'
  if (hasPayload || hasParams) return 'input'
  return ''
}
