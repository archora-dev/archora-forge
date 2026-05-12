import type { NormalizedOpenApi, NormalizedOperation, OpenApiSchema } from '../openapi/openapi.types.js'
import { resolveSchema } from '../generation/typeGeneration.js'

export type ContractDiffSeverity = 'breaking' | 'non-breaking' | 'warning'

export type ContractDiffChange = {
  code:
    | 'removed-endpoint'
    | 'added-endpoint'
    | 'request-schema-changed'
    | 'response-schema-changed'
    | 'required-field-added'
    | 'field-removed'
    | 'enum-value-added'
    | 'enum-value-removed'
    | 'type-changed'
  severity: ContractDiffSeverity
  resource: string
  location: string
  message: string
}

export type ContractDiffReport = {
  changes: ContractDiffChange[]
  affectedResources: string[]
  affectedFiles: string[]
}

export function diffOpenApiContracts(oldSchema: NormalizedOpenApi, newSchema: NormalizedOpenApi): ContractDiffReport {
  const changes: ContractDiffChange[] = []
  const oldOperations = operationMap(oldSchema.operations)
  const newOperations = operationMap(newSchema.operations)

  for (const [key, operation] of oldOperations) {
    if (!newOperations.has(key)) {
      const resource = resourceName(operation)
      changes.push({
        code: 'removed-endpoint',
        severity: 'breaking',
        resource,
        location: key,
        message: `${operation.method.toUpperCase()} ${operation.path} was removed.`,
      })
    }
  }

  for (const [key, operation] of newOperations) {
    const previous = oldOperations.get(key)
    const resource = resourceName(operation)
    if (!previous) {
      changes.push({
        code: 'added-endpoint',
        severity: 'non-breaking',
        resource,
        location: key,
        message: `${operation.method.toUpperCase()} ${operation.path} was added.`,
      })
      continue
    }

    changes.push(...diffObjectSchemas(oldSchema, newSchema, previous.requestBodySchema, operation.requestBodySchema, resource, `${key} request`))
    changes.push(...diffObjectSchemas(oldSchema, newSchema, previous.responseSchema, operation.responseSchema, resource, `${key} response`))
  }

  const affectedResources = [...new Set(changes.map((change) => change.resource))].sort()
  const affectedFiles = affectedResources.flatMap((resource) => [
    `src/shared/api/generated/${resource}/${resource}.types.ts`,
    `src/shared/api/generated/${resource}/${resource}.client.ts`,
    `src/features/${resource}/api/index.ts`,
  ])

  return { changes, affectedResources, affectedFiles }
}

function operationMap(operations: NormalizedOperation[]): Map<string, NormalizedOperation> {
  return new Map(operations.map((operation) => [`${operation.method.toUpperCase()} ${operation.path}`, operation]))
}

function diffObjectSchemas(
  oldNormalized: NormalizedOpenApi,
  newNormalized: NormalizedOpenApi,
  oldSchema: OpenApiSchema | null,
  newSchema: OpenApiSchema | null,
  resource: string,
  location: string,
): ContractDiffChange[] {
  const oldResolved = resolveSchema(oldNormalized, oldSchema)
  const newResolved = resolveSchema(newNormalized, newSchema)
  if (!oldResolved || !newResolved) {
    if (oldResolved === newResolved) return []
    return [
      {
        code: oldResolved ? 'response-schema-changed' : 'request-schema-changed',
        severity: 'warning',
        resource,
        location,
        message: `${location} schema presence changed.`,
      },
    ]
  }

  const changes: ContractDiffChange[] = []
  const oldRequired = new Set(oldResolved.required ?? [])
  const newRequired = new Set(newResolved.required ?? [])
  const oldProperties = oldResolved.properties ?? {}
  const newProperties = newResolved.properties ?? {}

  for (const name of Object.keys(oldProperties)) {
    if (!newProperties[name]) {
      changes.push({
        code: 'field-removed',
        severity: 'breaking',
        resource,
        location: `${location}.${name}`,
        message: `Field "${name}" was removed.`,
      })
    }
  }

  for (const [name, property] of Object.entries(newProperties)) {
    const previous = oldProperties[name]
    if (newRequired.has(name) && !oldRequired.has(name)) {
      changes.push({
        code: 'required-field-added',
        severity: 'breaking',
        resource,
        location: `${location}.${name}`,
        message: `Field "${name}" became required.`,
      })
    }
    if (!previous) continue
    if (previous.type !== property.type) {
      changes.push({
        code: 'type-changed',
        severity: 'breaking',
        resource,
        location: `${location}.${name}`,
        message: `Field "${name}" changed type from ${previous.type ?? 'unknown'} to ${property.type ?? 'unknown'}.`,
      })
    }
    changes.push(...diffEnumValues(previous, property, resource, `${location}.${name}`))
  }

  return changes
}

function diffEnumValues(
  previous: OpenApiSchema,
  next: OpenApiSchema,
  resource: string,
  location: string,
): ContractDiffChange[] {
  const oldValues = new Set(previous.enum ?? [])
  const newValues = new Set(next.enum ?? [])
  const changes: ContractDiffChange[] = []

  for (const value of oldValues) {
    if (!newValues.has(value)) {
      changes.push({
        code: 'enum-value-removed',
        severity: 'breaking',
        resource,
        location,
        message: `Enum value "${value}" was removed.`,
      })
    }
  }
  for (const value of newValues) {
    if (!oldValues.has(value)) {
      changes.push({
        code: 'enum-value-added',
        severity: 'non-breaking',
        resource,
        location,
        message: `Enum value "${value}" was added.`,
      })
    }
  }

  return changes
}

function resourceName(operation: NormalizedOperation): string {
  const tag = operation.tags[0]
  if (tag) return tag.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/\s+/g, '-').toLowerCase()
  const firstPathSegment = operation.path.split('/').filter(Boolean).find((segment) => !segment.startsWith('{')) ?? 'api'
  return firstPathSegment.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase()
}
