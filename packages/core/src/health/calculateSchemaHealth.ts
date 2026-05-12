import { detectResources } from '../resources/detectResources.js'
import type { SchemaHealthReport, SchemaHealthWarning } from './health.types.js'
import type { NormalizedOpenApi, OpenApiSchema } from '../openapi/openapi.types.js'

export function calculateSchemaHealth(normalized: NormalizedOpenApi): SchemaHealthReport {
  const warnings: SchemaHealthWarning[] = []

  for (const operation of normalized.operations) {
    const target = `${operation.method.toUpperCase()} ${operation.path}`
    if (!operation.id) warnings.push({ code: 'operation-id-missing', message: 'Operation has no operationId.', target })
    if (operation.tags.length === 0) warnings.push({ code: 'tags-missing', message: 'Operation has no tags.', target })
    if (!operation.responseSchema) warnings.push({ code: 'response-schema-missing', message: 'Operation has no explicit 2xx response schema.', target })
    if (!operation.hasErrorResponse) warnings.push({ code: 'error-response-missing', message: 'Operation has no 4xx/5xx response.', target })
  }

  const resourceCount = detectResources(normalized.operations).filter((resource) => resource.isCrudCandidate).length
  const score = calculateScore(normalized, warnings)

  return {
    score,
    endpointCount: normalized.operations.length,
    schemaCount: normalized.schemas.length,
    tagCount: normalized.tags.length,
    crudCandidateCount: resourceCount,
    enumCount: normalized.schemas.reduce((count, schema) => count + countEnums(schema.schema), 0),
    warnings,
  }
}

function calculateScore(normalized: NormalizedOpenApi, warnings: SchemaHealthWarning[]): number {
  const maxPenalty = normalized.operations.length * 8 + normalized.schemas.length * 2
  const warningPenalty = warnings.reduce((sum, warning) => {
    if (warning.code === 'operation-id-missing') return sum + 8
    if (warning.code === 'tags-missing') return sum + 6
    if (warning.code === 'response-schema-missing') return sum + 8
    if (warning.code === 'error-response-missing') return sum + 3
    return sum + 2
  }, 0)
  const schemaBonus = normalized.schemas.length > 0 ? 5 : 0
  const resourceBonus = detectResources(normalized.operations).some((resource) => resource.isCrudCandidate) ? 5 : 0

  return Math.max(0, Math.min(100, Math.round(100 - (warningPenalty / Math.max(maxPenalty, 1)) * 50 + schemaBonus + resourceBonus)))
}

function countEnums(schema: OpenApiSchema): number {
  const own = schema.enum ? 1 : 0
  const propertyEnums = Object.values(schema.properties ?? {}).reduce((count, property) => count + countEnums(property), 0)
  const itemEnums = schema.items ? countEnums(schema.items) : 0

  return own + propertyEnums + itemEnums
}
