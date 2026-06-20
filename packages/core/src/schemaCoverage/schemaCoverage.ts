import type { ForgeDiagnostic } from '../diagnostics/diagnostics.js'
import type { NormalizedOpenApi, NormalizedOperation, OpenApiSchema } from '../openapi/openapi.types.js'
import { isSupportedUnion } from '../generation/typeGeneration.js'

export type SchemaCoverageMatrix = {
  operations: {
    total: number
    generated: number
    diagnosticOnly: number
    byKind: Record<string, number>
    byRequestShape: Record<string, number>
    byResponseShape: Record<string, number>
  }
  schemas: {
    total: number
    unsupportedConstructs: Record<string, number>
  }
  cases: {
    generated: number
    skipped: number
    fallback: number
    diagnosticOnly: number
  }
}

export function createSchemaCoverageMatrix(normalized: NormalizedOpenApi, diagnostics: ForgeDiagnostic[]): SchemaCoverageMatrix {
  const operations = normalized.operations
  const unsupportedConstructs = countUnsupportedSchemaConstructs(normalized)
  const operationDiagnosticOnly = operations.filter((operation) => operation.operationKind === 'unsupported-operation').length
  const schemaDiagnosticOnly = Object.values(unsupportedConstructs).reduce((total, count) => total + count, 0)
  const generated = operations.filter((operation) => operation.operationKind !== 'unsupported-operation').length
  const fallback =
    operations.filter(hasFallbackShape).length +
    diagnostics.filter((diagnostic) => diagnostic.code === 'missing-request-schema' || diagnostic.code === 'missing-response-schema').length

  return {
    operations: {
      total: operations.length,
      generated,
      diagnosticOnly: operationDiagnosticOnly,
      byKind: countBy(operations, (operation) => operation.operationKind),
      byRequestShape: countBy(operations, requestShape),
      byResponseShape: countBy(operations, responseShape),
    },
    schemas: {
      total: normalized.schemas.length,
      unsupportedConstructs,
    },
    cases: {
      generated,
      skipped: operationDiagnosticOnly,
      fallback,
      diagnosticOnly: operationDiagnosticOnly + schemaDiagnosticOnly,
    },
  }
}

export function mergeSchemaCoverageMatrices(matrices: SchemaCoverageMatrix[]): SchemaCoverageMatrix {
  return {
    operations: {
      total: sum(matrices, (matrix) => matrix.operations.total),
      generated: sum(matrices, (matrix) => matrix.operations.generated),
      diagnosticOnly: sum(matrices, (matrix) => matrix.operations.diagnosticOnly),
      byKind: mergeRecords(matrices.map((matrix) => matrix.operations.byKind)),
      byRequestShape: mergeRecords(matrices.map((matrix) => matrix.operations.byRequestShape)),
      byResponseShape: mergeRecords(matrices.map((matrix) => matrix.operations.byResponseShape)),
    },
    schemas: {
      total: sum(matrices, (matrix) => matrix.schemas.total),
      unsupportedConstructs: mergeRecords(matrices.map((matrix) => matrix.schemas.unsupportedConstructs)),
    },
    cases: {
      generated: sum(matrices, (matrix) => matrix.cases.generated),
      skipped: sum(matrices, (matrix) => matrix.cases.skipped),
      fallback: sum(matrices, (matrix) => matrix.cases.fallback),
      diagnosticOnly: sum(matrices, (matrix) => matrix.cases.diagnosticOnly),
    },
  }
}

function requestShape(operation: NormalizedOperation): string {
  if (!operation.operation.requestBody) return 'none'
  if (operation.hasFilePayload) return 'binary'
  if (operation.isJsonRequest) return 'json'
  if (operation.requestContentTypes.some((type) => type.startsWith('text/'))) return 'text'
  if (operation.requestContentTypes.includes('multipart/form-data')) return 'multipart'
  if (operation.requestContentTypes.includes('application/x-www-form-urlencoded')) return 'form'
  return operation.requestBodySchema ? 'non-json' : 'missing'
}

function responseShape(operation: NormalizedOperation): string {
  if (operation.responseBodyEmpty) return 'empty'
  if (operation.hasFilePayload) return 'binary'
  if (operation.isJsonResponse) return 'json'
  if (operation.responseContentTypes.some((type) => type.startsWith('text/'))) return 'text'
  return operation.responseSchema ? 'non-json' : 'missing'
}

function hasFallbackShape(operation: NormalizedOperation): boolean {
  if (operation.operationKind === 'unsupported-operation') return false
  const requestFallback = Boolean(operation.operation.requestBody) && !operation.isJsonRequest && !operation.hasFilePayload
  const responseFallback = !operation.responseBodyEmpty && !operation.isJsonResponse && !operation.hasFilePayload && operation.method !== 'delete'
  return requestFallback || responseFallback
}

// Counts only schema constructs that are NOT fully modeled. Mergeable/annotation-only
// allOf is already flattened during normalization, and unions that generate a real
// TypeScript union (see isSupportedUnion) are not counted, so the matrix reflects
// actual generation rather than every occurrence of a composition keyword.
function countUnsupportedSchemaConstructs(normalized: NormalizedOpenApi): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const { schema } of normalized.schemas) {
    visitSchema(normalized, schema, counts)
  }
  return counts
}

function visitSchema(normalized: NormalizedOpenApi, schema: OpenApiSchema, counts: Record<string, number>): void {
  if (schema.allOf) counts.allOf = (counts.allOf ?? 0) + 1
  if (schema.oneOf && !isSupportedUnion(normalized, schema, schema.oneOf)) counts.oneOf = (counts.oneOf ?? 0) + 1
  if (schema.anyOf && !isSupportedUnion(normalized, schema, schema.anyOf)) counts.anyOf = (counts.anyOf ?? 0) + 1
  const union = schema.oneOf ?? schema.anyOf
  if (schema.discriminator && !(union && isSupportedUnion(normalized, schema, union))) counts.discriminator = (counts.discriminator ?? 0) + 1
  for (const property of Object.values(schema.properties ?? {})) {
    visitSchema(normalized, property, counts)
  }
  if (schema.items) {
    visitSchema(normalized, schema.items, counts)
  }
  for (const branch of [...(schema.allOf ?? []), ...(schema.oneOf ?? []), ...(schema.anyOf ?? [])]) {
    visitSchema(normalized, branch, counts)
  }
}

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const item of items) {
    const value = key(item)
    counts[value] = (counts[value] ?? 0) + 1
  }
  return counts
}

function mergeRecords(records: Array<Record<string, number>>): Record<string, number> {
  const merged: Record<string, number> = {}
  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      merged[key] = (merged[key] ?? 0) + value
    }
  }
  return merged
}

function sum<T>(items: T[], value: (item: T) => number): number {
  return items.reduce((total, item) => total + value(item), 0)
}
