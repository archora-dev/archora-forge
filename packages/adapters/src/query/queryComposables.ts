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
 * Builds a {@link ComposableGenerators} set that emits real TanStack Query hooks wired to
 * the framework-neutral client and query keys produced by the core. The same builder
 * serves every TanStack adapter; a {@link QueryFrameworkProfile} captures the per-framework
 * differences (package name, hook names, option types, how the query client is acquired and
 * whether options are passed as a value or, for Angular, a function).
 *
 * The hooks reference the framework's query package as a peer dependency of the consumer's
 * project — this package never imports them, it only emits source text, keeping the
 * toolchain framework-neutral.
 */
export type QueryComposableTarget =
  | 'tanstack-query'
  | 'vue-query'
  | 'svelte-query'
  | 'angular-query'

type QueryFrameworkProfile = {
  module: string
  queryHook: string
  mutationHook: string
  queryOptions: string
  mutationOptions: string
  queryClientHook: string
  /** Angular passes options through a factory function `() => (...)`; the rest pass a value. */
  optionsAsFunction: boolean
}

const reactQueryHooks = {
  queryHook: 'useQuery',
  mutationHook: 'useMutation',
  queryOptions: 'UseQueryOptions',
  mutationOptions: 'UseMutationOptions',
  queryClientHook: 'useQueryClient',
  optionsAsFunction: false,
} as const

const QUERY_PROFILES: Record<QueryComposableTarget, QueryFrameworkProfile> = {
  'tanstack-query': { module: '@tanstack/react-query', ...reactQueryHooks },
  'vue-query': { module: '@tanstack/vue-query', ...reactQueryHooks },
  'svelte-query': {
    module: '@tanstack/svelte-query',
    queryHook: 'createQuery',
    mutationHook: 'createMutation',
    queryOptions: 'CreateQueryOptions',
    mutationOptions: 'CreateMutationOptions',
    queryClientHook: 'useQueryClient',
    optionsAsFunction: false,
  },
  'angular-query': {
    module: '@tanstack/angular-query-experimental',
    queryHook: 'injectQuery',
    mutationHook: 'injectMutation',
    queryOptions: 'CreateQueryOptions',
    mutationOptions: 'CreateMutationOptions',
    queryClientHook: 'injectQueryClient',
    optionsAsFunction: true,
  },
}

/** Real React hooks built on `@tanstack/react-query`. */
export const tanstackQueryComposables: ComposableGenerators =
  createQueryComposables('tanstack-query')

/** Real Vue composables built on `@tanstack/vue-query`. */
export const vueQueryComposables: ComposableGenerators = createQueryComposables('vue-query')

/** Real Svelte runes built on `@tanstack/svelte-query`. */
export const svelteQueryComposables: ComposableGenerators = createQueryComposables('svelte-query')

/** Real Angular injectors built on `@tanstack/angular-query-experimental`. */
export const angularQueryComposables: ComposableGenerators = createQueryComposables('angular-query')

/**
 * Resolves the composable generators for a `target.query` value. Returns `undefined` for the
 * neutral `promise` target (and anything unknown) so the core falls back to its
 * framework-free default.
 */
const COMPOSABLES_BY_TARGET: Record<QueryComposableTarget, ComposableGenerators> = {
  'tanstack-query': tanstackQueryComposables,
  'vue-query': vueQueryComposables,
  'svelte-query': svelteQueryComposables,
  'angular-query': angularQueryComposables,
}

export function resolveQueryComposables(
  target: string | undefined,
): ComposableGenerators | undefined {
  return target && target in COMPOSABLES_BY_TARGET
    ? COMPOSABLES_BY_TARGET[target as QueryComposableTarget]
    : undefined
}

export function createQueryComposables(
  target: QueryComposableTarget | QueryFrameworkProfile,
): ComposableGenerators {
  const profile = typeof target === 'string' ? QUERY_PROFILES[target] : target
  return {
    list: (resourceName, resource) => listHook(profile, resourceName, resource),
    detail: (resourceName, resource) => detailHook(profile, resourceName, resource),
    createMutation: (resourceName, resource) => createMutationHook(profile, resourceName, resource),
    updateMutation: (resourceName, resource) => updateMutationHook(profile, resourceName, resource),
    deleteMutation: (resourceName, resource) => deleteMutationHook(profile, resourceName, resource),
    operation: (resourceName, operation) => operationHook(profile, resourceName, operation),
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

/** Wraps the options object literal, deferring it behind a factory for Angular's injectors. */
function callQuery(profile: QueryFrameworkProfile, hook: string, optionsLiteral: string): string {
  return profile.optionsAsFunction
    ? `${hook}(() => (${optionsLiteral}))`
    : `${hook}(${optionsLiteral})`
}

/**
 * Default cache invalidation handler. It is declared before the `...options` spread so a
 * caller-supplied `onSuccess` overrides it — the option types differ between frameworks, so
 * merging the two handlers is not portable.
 */
function invalidateOnSuccess(invalidation: string, usesVariables: boolean): string {
  const signature = usesVariables ? '(_data, variables)' : '()'
  return `onSuccess: ${signature} => {
      queryClient.invalidateQueries({ queryKey: ${invalidation} })
    },`
}

function listHook(
  profile: QueryFrameworkProfile,
  resourceName: string,
  resource: DetectedResource,
): string {
  const collection = pluralizeTypeName(resource.entity)
  if (!resource.operations.list?.id) return missingHook(`use${collection}Query`)
  const names = createResourceTypeNames(resource)
  const paths = importPaths(resourceName)
  const requiresParams = getPathParams(resource.operations.list).length > 0
  const call = callQuery(
    profile,
    profile.queryHook,
    `{
    queryKey: ${keysName(resourceName)}.list(params),
    queryFn: () => ${clientName(resourceName)}.${resource.operations.list.id}(params),
    ...options,
  }`,
  )
  return `import { ${profile.queryHook}, type ${profile.queryOptions} } from '${profile.module}'
import { ${clientName(resourceName)} } from '${paths.client}'
import { ${keysName(resourceName)} } from '${paths.keys}'
import type { ${names.listParamsType}, ${names.listResponseType} } from '${paths.types}'

export function use${collection}Query(
  params${requiresParams ? '' : '?'}: ${names.listParamsType},
  options?: Omit<${profile.queryOptions}<${names.listResponseType}>, 'queryKey' | 'queryFn'>,
) {
  return ${call}
}
`
}

function detailHook(
  profile: QueryFrameworkProfile,
  resourceName: string,
  resource: DetectedResource,
): string {
  if (!resource.operations.detail?.id) return missingHook(`use${resource.entity}Query`)
  const names = createResourceTypeNames(resource)
  const paths = importPaths(resourceName)
  const call = callQuery(
    profile,
    profile.queryHook,
    `{
    queryKey: ${keysName(resourceName)}.detail(id),
    queryFn: () => ${clientName(resourceName)}.${resource.operations.detail.id}(id),
    ...options,
  }`,
  )
  return `import { ${profile.queryHook}, type ${profile.queryOptions} } from '${profile.module}'
import { ${clientName(resourceName)} } from '${paths.client}'
import { ${keysName(resourceName)} } from '${paths.keys}'
import type { ${names.detailResponseType}, ${names.idType} } from '${paths.types}'

export function use${resource.entity}Query(
  id: ${names.idType},
  options?: Omit<${profile.queryOptions}<${names.detailResponseType}>, 'queryKey' | 'queryFn'>,
) {
  return ${call}
}
`
}

function createMutationHook(
  profile: QueryFrameworkProfile,
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
  const call = callQuery(
    profile,
    profile.mutationHook,
    `{
    mutationFn: (input: ${inputType}) => ${clientName(resourceName)}.${resource.operations.create.id}(${callArgs}),
    ${invalidateOnSuccess(invalidation, hasPathParams)}
    ...options,
  }`,
  )

  return `import { ${profile.mutationHook}, ${profile.queryClientHook}, type ${profile.mutationOptions} } from '${profile.module}'
import { ${clientName(resourceName)} } from '${paths.client}'
import { ${keysName(resourceName)} } from '${paths.keys}'
import type { ${typeImports} } from '${paths.types}'

export function useCreate${resource.entity}Mutation(
  options?: Omit<${profile.mutationOptions}<${names.createResponseType}, Error, ${inputType}>, 'mutationFn'>,
) {
  const queryClient = ${profile.queryClientHook}()
  return ${call}
}
`
}

function updateMutationHook(
  profile: QueryFrameworkProfile,
  resourceName: string,
  resource: DetectedResource,
): string {
  if (!resource.operations.update?.id) return missingHook(`useUpdate${resource.entity}Mutation`)
  const names = createResourceTypeNames(resource)
  const paths = importPaths(resourceName)
  const inputType = `{ id: ${names.idType}; payload: ${names.updateRequestType} }`
  const call = callQuery(
    profile,
    profile.mutationHook,
    `{
    mutationFn: (input: ${inputType}) => ${clientName(resourceName)}.${resource.operations.update.id}(input.id, input.payload),
    ${invalidateOnSuccess(`${keysName(resourceName)}.detail(variables.id)`, true)}
    ...options,
  }`,
  )

  return `import { ${profile.mutationHook}, ${profile.queryClientHook}, type ${profile.mutationOptions} } from '${profile.module}'
import { ${clientName(resourceName)} } from '${paths.client}'
import { ${keysName(resourceName)} } from '${paths.keys}'
import type { ${names.idType}, ${names.updateRequestType}, ${names.updateResponseType} } from '${paths.types}'

export function useUpdate${resource.entity}Mutation(
  options?: Omit<${profile.mutationOptions}<${names.updateResponseType}, Error, ${inputType}>, 'mutationFn'>,
) {
  const queryClient = ${profile.queryClientHook}()
  return ${call}
}
`
}

function deleteMutationHook(
  profile: QueryFrameworkProfile,
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
  const call = callQuery(
    profile,
    profile.mutationHook,
    `{
    mutationFn: (id: ${names.idType}) => ${clientName(resourceName)}.${resource.operations.delete.id}(id),
    ${invalidateOnSuccess(invalidation, invalidatesDetail)}
    ...options,
  }`,
  )

  return `import { ${profile.mutationHook}, ${profile.queryClientHook}, type ${profile.mutationOptions} } from '${profile.module}'
import { ${clientName(resourceName)} } from '${paths.client}'
import { ${keysName(resourceName)} } from '${paths.keys}'
import type { ${names.idType} } from '${paths.types}'

export function useDelete${resource.entity}Mutation(
  options?: Omit<${profile.mutationOptions}<void, Error, ${names.idType}>, 'mutationFn'>,
) {
  const queryClient = ${profile.queryClientHook}()
  return ${call}
}
`
}

function operationHook(
  profile: QueryFrameworkProfile,
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
    const call = callQuery(
      profile,
      profile.queryHook,
      `{
    queryKey: ${keyEntries},
    queryFn: () => ${clientName(resourceName)}.${operation.id}(${callArgs}),
    ...options,
  }`,
    )
    return `import { ${profile.queryHook}, type ${profile.queryOptions} } from '${profile.module}'
import { ${clientName(resourceName)} } from '${paths.client}'
import { ${keysName(resourceName)} } from '${paths.keys}'
import type { ${typeImports} } from '${paths.types}'

export function ${hookName}(
${hasInput ? `  input: ${inputType},\n` : ''}  options?: Omit<${profile.queryOptions}<${names.responseType}>, 'queryKey' | 'queryFn'>,
) {
  return ${call}
}
`
  }

  const call = callQuery(
    profile,
    profile.mutationHook,
    `{
    mutationFn: (${hasInput ? `input: ${inputType}` : ''}) => ${clientName(resourceName)}.${operation.id}(${callArgs}),
    ...options,
  }`,
  )
  return `import { ${profile.mutationHook}, type ${profile.mutationOptions} } from '${profile.module}'
import { ${clientName(resourceName)} } from '${paths.client}'
import type { ${typeImports} } from '${paths.types}'

export function ${hookName}(
  options?: Omit<${profile.mutationOptions}<${names.responseType}, Error, ${inputType}>, 'mutationFn'>,
) {
  return ${call}
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
