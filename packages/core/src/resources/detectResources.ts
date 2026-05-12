import type { NormalizedOperation, OperationKind } from '../openapi/openapi.types.js'
import { createIdentifierRegistry, toSafeTypeName } from '../generation/identifiers.js'
import type { CrudOperation, DetectedResource, ResourceKind } from './resources.types.js'

const crudOperations: CrudOperation[] = ['list', 'detail', 'create', 'update', 'delete']

export function detectResources(operations: NormalizedOperation[]): DetectedResource[] {
  const grouped = new Map<string, NormalizedOperation[]>()

  for (const operation of operations) {
    const resourceName = createResourceGroupName(operation)
    grouped.set(resourceName, [...(grouped.get(resourceName) ?? []), operation])
  }

  const resourceNames = createIdentifierRegistry()
  return [...grouped.entries()].map(([rawName, operationsList]) => {
    const name = resourceNames.identifier(rawName, 'resource')
    const resourceOperations = createCrudOperations(operationsList)
    const operationsByKind = groupByKind(operationsList)
    const kind = classifyResourceKind(operationsList, resourceOperations)
    const missing = crudOperations.filter((operation) => !resourceOperations[operation])

    return {
      name,
      entity: singularize(toSafeTypeName(name, 'Resource')),
      kind,
      operationsList,
      operationsByKind,
      operations: resourceOperations,
      missing,
      isCrudCandidate: resourceOperations.list !== undefined && resourceOperations.detail !== undefined,
    }
  })
}

function createCrudOperations(operations: NormalizedOperation[]): Partial<Record<CrudOperation, NormalizedOperation>> {
  const resourceOperations: Partial<Record<CrudOperation, NormalizedOperation>> = {}
  for (const operation of operations) {
    const crudOperation = classifyCrudOperation(operation)
    if (!crudOperation || resourceOperations[crudOperation]) continue
    resourceOperations[crudOperation] = operation
  }

  return resourceOperations
}

function classifyCrudOperation(operation: NormalizedOperation): CrudOperation | null {
  if (operation.operationKind !== 'crud-resource') return null
  const hasPathParam = /\{[^}]+\}/.test(operation.path)
  if (operation.method === 'get' && !hasPathParam) return 'list'
  if (operation.method === 'get' && hasPathParam) return 'detail'
  if (operation.method === 'post' && !hasPathParam) return 'create'
  if ((operation.method === 'patch' || operation.method === 'put') && hasPathParam) return 'update'
  if (operation.method === 'delete' && hasPathParam) return 'delete'
  return null
}

function createResourceGroupName(operation: NormalizedOperation): string {
  const segments = meaningfulSegments(operation.path)
  if (operation.operationKind === 'crud-resource') {
    return segments.at(-1) ?? operation.id ?? 'resource'
  }
  return segments.length > 0 ? segments.join('-') : operation.id ?? 'operation'
}

function meaningfulSegments(path: string): string[] {
  const segments = path
    .split('/')
    .filter(Boolean)
    .filter((segment) => !segment.startsWith('{'))
    .filter((segment) => !['api', 'v1', 'v2', 'v3'].includes(segment.toLowerCase()))

  return segments
}

function groupByKind(operations: NormalizedOperation[]): Partial<Record<OperationKind, NormalizedOperation[]>> {
  const grouped: Partial<Record<OperationKind, NormalizedOperation[]>> = {}
  for (const operation of operations) {
    grouped[operation.operationKind] = [...(grouped[operation.operationKind] ?? []), operation]
  }
  return grouped
}

function classifyResourceKind(
  operations: NormalizedOperation[],
  resourceOperations: Partial<Record<CrudOperation, NormalizedOperation>>,
): ResourceKind {
  const hasCrudSurface =
    Boolean(resourceOperations.list) ||
    Boolean(resourceOperations.create) ||
    Boolean(resourceOperations.update) ||
    Boolean(resourceOperations.delete) ||
    (Boolean(resourceOperations.detail) && operations.every((operation) => operation.operationKind === 'crud-resource'))
  if (hasCrudSurface) return 'crud-resource'
  const order: ResourceKind[] = [
    'file-operation',
    'search-resource',
    'action-operation',
    'dashboard-resource',
    'read-only-resource',
    'unsupported-operation',
  ]
  return order.find((kind) => operations.some((operation) => operation.operationKind === kind)) ?? 'unsupported-operation'
}

function singularize(value: string): string {
  if (value.endsWith('ies')) {
    return `${value.slice(0, -3)}y`
  }

  if (value.endsWith('s')) {
    return value.slice(0, -1)
  }

  return value
}
