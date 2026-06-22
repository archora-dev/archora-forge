import type { NormalizedOpenApi, OpenApiSchema } from '../openapi/openapi.types.js'
import { analyzeAllOfSchema, unwrapAnnotationOnlyAllOfSchema } from '../openapi/composition.js'
import { isObjectSchemaBranch, isSupportedUnion } from '../generation/typeGeneration.js'
import { runPluginDiagnostics } from '../plugins/plugins.js'

export type ForgeDiagnostic = {
  severity: 'warning' | 'error'
  code: string
  message: string
  location?: string
  impact?: string
  suggestion?: string
}

export type CollectDiagnosticsOptions = {
  plugins?: unknown[]
}

export function collectDiagnostics(
  normalized: NormalizedOpenApi,
  options: CollectDiagnosticsOptions = {},
): ForgeDiagnostic[] {
  const diagnostics: ForgeDiagnostic[] = []
  const groupedParameters = new Map<
    string,
    { in: 'header' | 'cookie'; name: string; locations: string[] }
  >()

  const unsupportedSecuritySchemes = Object.entries(
    normalized.document.components?.securitySchemes ?? {},
  ).filter(([, scheme]) => !isRuntimeSupportedSecurityScheme(scheme))
  if (unsupportedSecuritySchemes.length > 0) {
    diagnostics.push({
      severity: 'warning',
      code: 'unsupported-security-schemes',
      message: 'Unsupported security schemes are detected.',
      location: unsupportedSecuritySchemes
        .map(([name]) => `components.securitySchemes.${name}`)
        .join(', '),
      suggestion:
        'Configure auth headers through the runtime client until security scheme generation is supported.',
    })
  }

  for (const operation of normalized.operations) {
    const location = `${operation.method.toUpperCase()} ${operation.path}`
    const requestContentTypes = getContentTypes(operation.operation.requestBody)
    const responseContentTypes = Object.values(operation.operation.responses ?? {}).flatMap(
      (response) => Object.keys(response.content ?? {}),
    )

    if (operation.operationKind === 'unsupported-operation') {
      diagnostics.push({
        severity: 'warning',
        code: 'unsupported-operation',
        message: `${location} is preserved but is not generated as an interactive resource yet.`,
        location,
        impact:
          'Generated output uses an explicit unsupported operation panel instead of silently dropping the operation.',
        suggestion:
          'Use a supported HTTP method and JSON-compatible request/response schemas, or implement this endpoint with custom code.',
      })
    }

    if (operation.operation.requestBody && !operation.requestBodySchema) {
      diagnostics.push({
        severity: 'warning',
        code: requestContentTypes.some((type) => !isJsonCompatibleContentType(type))
          ? 'unsupported-content-type'
          : 'missing-request-schema',
        message: `${location} has no supported JSON request schema. Generated request type will use an explicit fallback.`,
        location,
        impact: 'Request payload typing may fall back to an explicit generic type.',
        suggestion:
          'Add an application/json request body schema to improve generated request types.',
      })
    }

    if (
      !operation.responseSchema &&
      !operation.responseBodyEmpty &&
      operation.method !== 'delete'
    ) {
      diagnostics.push({
        severity: 'warning',
        code: responseContentTypes.some((type) => !isJsonCompatibleContentType(type))
          ? 'unsupported-content-type'
          : 'missing-response-schema',
        message: `${location} has no 2xx JSON response schema. Generated response type will be unknown.`,
        location,
        impact: 'Response typing and generated UI metadata may be incomplete.',
        suggestion:
          'Add an application/json 2xx response schema to improve generated response types.',
      })
    }

    for (const parameter of operation.parameters) {
      if (parameter.in === 'header' || parameter.in === 'cookie') {
        if (parameter.in === 'header') {
          // Header parameters are generated: non-CRUD helpers carry them in the typed
          // params object, CRUD helpers type them onto `options.headers`, and the
          // `authorization` header is the runtime auth layer's responsibility.
          continue
        }
        if (parameter.in === 'cookie' && parameter.name.toLowerCase() === 'authorization') {
          const key = `${parameter.in}:${parameter.name.toLowerCase()}`
          const grouped = groupedParameters.get(key) ?? {
            in: parameter.in,
            name: parameter.name,
            locations: [],
          }
          grouped.locations.push(location)
          groupedParameters.set(key, grouped)
          continue
        }
        diagnostics.push({
          severity: 'warning',
          code: `unsupported-${parameter.in}-parameter`,
          message: `${location} uses an unsupported ${parameter.in} parameter "${parameter.name}".`,
          location,
          impact: 'Generated client signatures do not include this parameter yet.',
          suggestion:
            'Model this value through runtime headers until header/cookie parameter generation is supported.',
        })
      }
    }

    if (operation.operation.security) {
      diagnostics.push({
        severity: 'warning',
        code: 'unsupported-operation-security',
        message: `${location} defines operation-level security that is not generated yet.`,
        location,
        impact: 'Generated client calls require runtime auth configuration.',
        suggestion: 'Configure auth through createApiClient headers/getHeaders for now.',
      })
    }
  }

  for (const grouped of groupedParameters.values()) {
    diagnostics.push({
      severity: 'warning',
      code: `unsupported-${grouped.in}-parameter`,
      message: `${grouped.locations.length} operations use unsupported ${grouped.in} parameter "${grouped.name}".`,
      location:
        grouped.locations.slice(0, 3).join(', ') + (grouped.locations.length > 3 ? ', ...' : ''),
      impact: 'Repeated auth/header parameters are grouped to reduce diagnostic noise.',
      suggestion:
        'Model this value through runtime headers until header/cookie parameter generation is supported.',
    })
  }

  const schemaDiagnostics: ForgeDiagnostic[] = []
  for (const schema of normalized.schemas) {
    const originalSchema = normalized.document.components?.schemas?.[schema.name] ?? schema.schema
    collectSchemaDiagnostics(
      normalized,
      originalSchema,
      `#/components/schemas/${schema.name}`,
      schemaDiagnostics,
    )
  }
  diagnostics.push(...schemaDiagnostics)

  diagnostics.push(...runPluginDiagnostics({ plugins: options.plugins, normalized }))

  return diagnostics
}

function collectSchemaDiagnostics(
  normalized: NormalizedOpenApi,
  schema: OpenApiSchema,
  location: string,
  diagnostics: ForgeDiagnostic[],
): void {
  if (schema.allOf) {
    const unwrapped = unwrapAnnotationOnlyAllOfSchema(schema)
    const analysis = unwrapped ? null : analyzeAllOfSchema(normalized.document, schema)
    if (!analysis) {
      // Annotation-only wrappers such as allOf: [$ref, { default }] are type-transparent.
    } else if (analysis.kind === 'mergeable') {
      // Safe allOf merges are represented in the normalized schema, so they are not surfaced as user-facing warnings.
    } else if (analysis.kind === 'conflicting') {
      diagnostics.push({
        severity: 'error',
        code: 'conflicting-allof',
        message: `${location} has conflicting allOf branches for property "${analysis.property}".`,
        location,
        suggestion: analysis.reason,
      })
    } else {
      diagnostics.push({
        severity: 'warning',
        code: 'unsupported-allof',
        message: `${location} uses allOf, which is reported but not deeply modeled yet.`,
        location,
        suggestion: analysis.reason,
      })
    }
  }
  for (const key of ['oneOf', 'anyOf'] as const) {
    if (!schema[key]) continue
    if (isSupportedUnion(normalized, schema, schema[key])) continue
    const branches = schema[key].map((_, index) => `${location}/${key}/${index}`).join(', ')
    diagnostics.push({
      severity: 'warning',
      code: `unsupported-${key.toLowerCase()}`,
      message: `${location} uses ${key}, which is reported but not deeply modeled yet.`,
      location,
      impact: schema.discriminator
        ? `Generated types may fall back to a broader shape for discriminator-based branches: ${branches}.`
        : `Generated types may fall back to a broader shape for branches: ${branches}.`,
      suggestion: schema.discriminator
        ? 'Discriminator is present; validate generated fallback types carefully or prefer an explicit non-polymorphic response shape for v1 generation.'
        : 'Prefer a concrete object schema for v1 generation, or validate generated fallback types carefully.',
    })
  }
  if (schema.discriminator && !isSupportedDiscriminatedUnion(normalized, schema)) {
    diagnostics.push({
      severity: 'warning',
      code: 'unsupported-discriminator',
      message: `${location} uses discriminator, which is not modeled yet.`,
      location,
      impact: 'Generated union narrowing will not reflect discriminator semantics yet.',
      suggestion: 'Avoid discriminator-dependent generation until composition support is expanded.',
    })
  }
  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    collectSchemaDiagnostics(normalized, property, `${location}/properties/${name}`, diagnostics)
  }
  if (schema.items) {
    collectSchemaDiagnostics(normalized, schema.items, `${location}/items`, diagnostics)
  }
}

function isSupportedDiscriminatedUnion(
  normalized: NormalizedOpenApi,
  schema: OpenApiSchema,
): boolean {
  const branches = schema.oneOf ?? schema.anyOf
  return (
    Boolean(branches?.length) &&
    branches!.every((branch) => isObjectSchemaBranch(normalized, branch))
  )
}

function isRuntimeSupportedSecurityScheme(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const scheme = value as { type?: unknown; scheme?: unknown; in?: unknown }
  if (
    scheme.type === 'http' &&
    typeof scheme.scheme === 'string' &&
    scheme.scheme.toLowerCase() === 'bearer'
  )
    return true
  if (scheme.type === 'oauth2') return true
  return scheme.type === 'apiKey' && scheme.in === 'header'
}

function getContentTypes(value: unknown): string[] {
  if (!value || typeof value !== 'object' || !('content' in value)) return []
  const content = (value as { content?: unknown }).content
  return content && typeof content === 'object' ? Object.keys(content) : []
}

function isJsonCompatibleContentType(contentType: string): boolean {
  const normalized = contentType.split(';')[0]?.trim().toLowerCase() ?? ''
  return normalized === 'application/json' || normalized.endsWith('+json')
}
