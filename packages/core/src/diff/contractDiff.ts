import type { NormalizedOpenApi, NormalizedOperation, OpenApiSchema } from '../openapi/openapi.types.js'
import { resolveSchema } from '../generation/typeGeneration.js'
import { pluralizeTypeName } from '../generation/identifiers.js'
import { operationComposableName } from '../generation/artifacts/composableGenerators.js'
import { detectResources } from '../resources/detectResources.js'
import type { DetectedResource } from '../resources/resources.types.js'

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
  changelog: string[]
  summary: {
    breaking: number
    warnings: number
    nonBreaking: number
    total: number
  }
  decision: {
    status: 'approved' | 'review' | 'blocked'
    mergeRisk: 'low' | 'medium' | 'high'
    reason: string
  }
  impactedSurface: {
    operationIds: string[]
    clientMethods: string[]
    queryHooks: string[]
  }
  migrationHints: string[]
  prSummary: string
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
  const summary = summarizeChanges(changes)
  const decision = createImpactDecision(summary)
  const impactedSurface = collectImpactedSurface(changes, oldOperations, newOperations)
  const migrationHints = createMigrationHints(changes)
  const changelog = formatContractDiffChangelog({ changes, affectedResources, affectedFiles })

  return {
    changes,
    affectedResources,
    affectedFiles,
    changelog,
    summary,
    decision,
    impactedSurface,
    migrationHints,
    prSummary: formatPullRequestSummary({ summary, decision, affectedResources, affectedFiles, migrationHints }),
  }
}

export function formatContractDiffChangelog(report: Pick<ContractDiffReport, 'changes' | 'affectedResources' | 'affectedFiles'>): string[] {
  const lines: string[] = []
  const byResource = new Map<string, ContractDiffChange[]>()
  for (const change of report.changes) {
    byResource.set(change.resource, [...(byResource.get(change.resource) ?? []), change])
  }
  for (const [resource, changes] of [...byResource.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const breaking = changes.filter((change) => change.severity === 'breaking').length
    const nonBreaking = changes.filter((change) => change.severity === 'non-breaking').length
    const warnings = changes.filter((change) => change.severity === 'warning').length
    const prefix = breaking > 0 ? 'BREAKING' : warnings > 0 ? 'WARNING' : 'CHANGED'
    lines.push(`${prefix} ${resource}: ${breaking} breaking, ${nonBreaking} non-breaking, ${warnings} warning changes.`)
  }
  if (report.affectedFiles.length > 0) {
    lines.push(`${report.affectedFiles.length} resource contract files affected.`)
  }
  return lines
}

function operationMap(operations: NormalizedOperation[]): Map<string, NormalizedOperation> {
  return new Map(operations.map((operation) => [`${operation.method.toUpperCase()} ${operation.path}`, operation]))
}

function summarizeChanges(changes: ContractDiffChange[]): ContractDiffReport['summary'] {
  const breaking = changes.filter((change) => change.severity === 'breaking').length
  const warnings = changes.filter((change) => change.severity === 'warning').length
  const nonBreaking = changes.filter((change) => change.severity === 'non-breaking').length
  return { breaking, warnings, nonBreaking, total: changes.length }
}

function createImpactDecision(summary: ContractDiffReport['summary']): ContractDiffReport['decision'] {
  if (summary.breaking > 0) {
    return {
      status: 'blocked',
      mergeRisk: 'high',
      reason: `${summary.breaking} breaking frontend contract change${summary.breaking === 1 ? '' : 's'} detected.`,
    }
  }
  if (summary.warnings > 0) {
    return {
      status: 'review',
      mergeRisk: 'medium',
      reason: `${summary.warnings} schema change${summary.warnings === 1 ? '' : 's'} need frontend review.`,
    }
  }
  return {
    status: 'approved',
    mergeRisk: 'low',
    reason: summary.nonBreaking > 0 ? 'Only non-breaking frontend contract changes detected.' : 'No frontend contract changes detected.',
  }
}

function collectImpactedSurface(
  changes: ContractDiffChange[],
  oldOperations: Map<string, NormalizedOperation>,
  newOperations: Map<string, NormalizedOperation>,
): ContractDiffReport['impactedSurface'] {
  const operationIds = new Set<string>()
  for (const change of changes) {
    const operation =
      oldOperations.get(operationKeyFromLocation(change.location)) ??
      newOperations.get(operationKeyFromLocation(change.location))
    const operationId = operation?.sourceOperationId ?? operation?.id
    if (operationId) operationIds.add(operationId)
  }
  const sortedOperationIds = [...operationIds].sort()
  const resources = detectResources([...new Map([...oldOperations, ...newOperations]).values()])
  const queryHooks = new Set<string>()
  for (const id of sortedOperationIds) {
    queryHooks.add(
      `use${pascalCase(id)}${id.toLowerCase().startsWith('get') || id.toLowerCase().startsWith('list') || id.toLowerCase().startsWith('search') ? 'Query' : 'Mutation'}`,
    )
    const generatedHook = generatedHookName(resources, id)
    if (generatedHook) queryHooks.add(generatedHook)
  }
  return {
    operationIds: sortedOperationIds,
    clientMethods: sortedOperationIds.map((id) => `${id}()`),
    queryHooks: [...queryHooks].sort(),
  }
}

// Maps an affected operation to the actual generated hook name a consumer imports
// (entity-based, e.g. usePetsQuery / usePetQuery), in addition to the operationId-based
// name. Without this the scan misses hand-written code that uses the generated hooks.
function generatedHookName(resources: DetectedResource[], operationId: string): string | null {
  const isOp = (operation: NormalizedOperation | undefined): boolean =>
    Boolean(operation) &&
    (operation!.id === operationId || operation!.sourceOperationId === operationId)
  for (const resource of resources) {
    const { entity, operations } = resource
    if (isOp(operations.list)) return `use${pluralizeTypeName(entity)}Query`
    if (isOp(operations.detail)) return `use${entity}Query`
    if (isOp(operations.create)) return `useCreate${entity}Mutation`
    if (isOp(operations.update)) return `useUpdate${entity}Mutation`
    if (isOp(operations.delete)) return `useDelete${entity}Mutation`
    const generated = resource.operationsList.find(
      (operation) =>
        isOp(operation) &&
        operation.operationKind !== 'unsupported-operation' &&
        !Object.values(operations).includes(operation),
    )
    if (generated) return operationComposableName(generated)
  }
  return null
}

function operationKeyFromLocation(location: string): string {
  const match = location.match(/^([A-Z]+)\s+([^\s]+)/)
  return match ? `${match[1]} ${match[2]}` : location
}

function createMigrationHints(changes: ContractDiffChange[]): string[] {
  const hints = changes.map((change) => {
    switch (change.code) {
      case 'removed-endpoint':
        return `${change.resource}: replace usages before regenerating. ${change.message}`
      case 'required-field-added':
        return `${change.resource}: update create/update payload builders and forms for the new required field. ${change.message}`
      case 'field-removed':
        return `${change.resource}: remove reads, table columns and form bindings for the deleted field. ${change.message}`
      case 'type-changed':
        return `${change.resource}: update TypeScript consumers and runtime formatting for the changed field type. ${change.message}`
      case 'enum-value-removed':
        return `${change.resource}: remove UI options and branch handling for the removed enum value. ${change.message}`
      case 'enum-value-added':
        return `${change.resource}: add UI labels and handling for the new enum value if this field is user-visible. ${change.message}`
      case 'request-schema-changed':
        return `${change.resource}: review request mappers, forms and mutation payloads. ${change.message}`
      case 'response-schema-changed':
        return `${change.resource}: review response readers, tables and detail views. ${change.message}`
      case 'added-endpoint':
        return `${change.resource}: new endpoint is available after regeneration. ${change.message}`
    }
  })
  return [...new Set(hints)].slice(0, 30)
}

function formatPullRequestSummary(input: {
  summary: ContractDiffReport['summary']
  decision: ContractDiffReport['decision']
  affectedResources: string[]
  affectedFiles: string[]
  migrationHints: string[]
}): string {
  const lines = [
    `Frontend API impact: ${input.decision.status} (${input.decision.mergeRisk} risk).`,
    input.decision.reason,
    `Changes: ${input.summary.breaking} breaking, ${input.summary.warnings} warnings, ${input.summary.nonBreaking} non-breaking.`,
    `Affected resources: ${input.affectedResources.length > 0 ? input.affectedResources.join(', ') : 'none'}.`,
    `Affected generated files: ${input.affectedFiles.length}.`,
  ]
  if (input.migrationHints.length > 0) {
    lines.push('Migration hints:')
    lines.push(...input.migrationHints.slice(0, 5).map((hint) => `- ${hint}`))
  }
  return lines.join('\n')
}

function pascalCase(value: string): string {
  return value
    .replace(/[^A-Za-z0-9]+(.)/g, (_match, char: string) => char.toUpperCase())
    .replace(/^./, (char) => char.toUpperCase())
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
