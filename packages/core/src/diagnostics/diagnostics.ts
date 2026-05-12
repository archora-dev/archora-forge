import type { NormalizedOpenApi, OpenApiSchema } from '../openapi/openapi.types.js'
import { analyzeAllOfSchema } from '../openapi/composition.js'
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

export function collectDiagnostics(normalized: NormalizedOpenApi, options: CollectDiagnosticsOptions = {}): ForgeDiagnostic[] {
  const diagnostics: ForgeDiagnostic[] = []
  const groupedParameters = new Map<string, { in: 'header' | 'cookie'; name: string; locations: string[] }>()

  if (normalized.document.components?.securitySchemes && Object.keys(normalized.document.components.securitySchemes).length > 0) {
    diagnostics.push({
      severity: 'warning',
      code: 'unsupported-security-schemes',
      message: 'Security schemes are detected but are not wired into generated clients yet.',
      location: 'components.securitySchemes',
      suggestion: 'Configure auth headers through the runtime client until security scheme generation is supported.',
    })
  }

  for (const operation of normalized.operations) {
    const location = `${operation.method.toUpperCase()} ${operation.path}`
    const requestContentTypes = getContentTypes(operation.operation.requestBody)
    const responseContentTypes = Object.values(operation.operation.responses ?? {}).flatMap((response) => Object.keys(response.content ?? {}))

    if (operation.operationKind === 'unsupported-operation') {
      diagnostics.push({
        severity: 'warning',
        code: 'unsupported-operation',
        message: `${location} is preserved but is not generated as an interactive resource yet.`,
        location,
        impact: 'Generated output uses an explicit unsupported operation panel instead of silently dropping the operation.',
        suggestion: 'Use a supported HTTP method and JSON-compatible request/response schemas, or implement this endpoint with custom code.',
      })
    }

    if (operation.operation.requestBody && !operation.requestBodySchema) {
      diagnostics.push({
        severity: 'warning',
        code: requestContentTypes.some((type) => !isJsonCompatibleContentType(type)) ? 'unsupported-content-type' : 'missing-request-schema',
        message: `${location} has no supported JSON request schema. Generated request type will use an explicit fallback.`,
        location,
        impact: 'Request payload typing may fall back to an explicit generic type.',
        suggestion: 'Add an application/json request body schema to improve generated request types.',
      })
    }

    if (!operation.responseSchema && operation.method !== 'delete') {
      diagnostics.push({
        severity: 'warning',
        code: responseContentTypes.some((type) => !isJsonCompatibleContentType(type)) ? 'unsupported-content-type' : 'missing-response-schema',
        message: `${location} has no 2xx JSON response schema. Generated response type will be unknown.`,
        location,
        impact: 'Response typing and generated UI metadata may be incomplete.',
        suggestion: 'Add an application/json 2xx response schema to improve generated response types.',
      })
    }

    for (const parameter of operation.parameters) {
      if (parameter.in === 'header' || parameter.in === 'cookie') {
        if (parameter.name.toLowerCase() === 'authorization') {
          const key = `${parameter.in}:${parameter.name.toLowerCase()}`
          const grouped = groupedParameters.get(key) ?? { in: parameter.in, name: parameter.name, locations: [] }
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
          suggestion: 'Model this value through runtime headers until header/cookie parameter generation is supported.',
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
      location: grouped.locations.slice(0, 3).join(', ') + (grouped.locations.length > 3 ? ', ...' : ''),
      impact: 'Repeated auth/header parameters are grouped to reduce diagnostic noise.',
      suggestion: 'Model this value through runtime headers until header/cookie parameter generation is supported.',
    })
  }

  const schemaDiagnostics: ForgeDiagnostic[] = []
  for (const schema of normalized.schemas) {
    const originalSchema = normalized.document.components?.schemas?.[schema.name] ?? schema.schema
    collectSchemaDiagnostics(normalized, originalSchema, `#/components/schemas/${schema.name}`, schemaDiagnostics)
  }
  diagnostics.push(...groupSchemaDiagnostics(schemaDiagnostics))

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
    const analysis = analyzeAllOfSchema(normalized.document, schema)
    if (analysis.kind === 'mergeable') {
      diagnostics.push({
        severity: 'warning',
        code: 'supported-allof-object-merge',
        message: `${location} uses simple object allOf composition that can be merged safely.`,
        location,
        impact: 'Generated types use a safe merged object shape.',
        suggestion: 'Review merged generated types; complex allOf semantics remain outside public-preview support.',
      })
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
      diagnostics.push({
        severity: 'warning',
        code: `unsupported-${key.toLowerCase()}`,
        message: `${location} uses ${key}, which is reported but not deeply modeled yet.`,
        location,
        impact: 'Generated types may fall back to a broader shape for this schema branch.',
        suggestion: 'Prefer a concrete object schema for public preview generation, or validate generated fallback types carefully.',
      })
  }
  if (schema.discriminator) {
    diagnostics.push({
      severity: 'warning',
      code: 'unsupported-discriminator',
      message: `${location} uses discriminator, which is not modeled yet.`,
      location,
      impact: 'Generated union narrowing will not reflect discriminator semantics yet.',
      suggestion: 'Avoid discriminator-dependent generation until composition support is expanded.',
    })
  }
  if (schema.format === 'binary') {
    diagnostics.push({
      severity: 'warning',
      code: 'unsupported-binary-file',
      message: `${location} uses binary file data, which is not generated yet.`,
      location,
      impact: 'Generated UI uses explicit file/action limitations instead of a full upload control.',
      suggestion: 'Handle uploads/downloads with custom runtime code for now.',
    })
  }
  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    collectSchemaDiagnostics(normalized, property, `${location}/properties/${name}`, diagnostics)
  }
  if (schema.items) {
    collectSchemaDiagnostics(normalized, schema.items, `${location}/items`, diagnostics)
  }
}

function getContentTypes(value: unknown): string[] {
  if (!value || typeof value !== 'object' || !('content' in value)) return []
  const content = (value as { content?: unknown }).content
  return content && typeof content === 'object' ? Object.keys(content) : []
}

function groupSchemaDiagnostics(diagnostics: ForgeDiagnostic[]): ForgeDiagnostic[] {
  const supportedAllOf = diagnostics.filter((diagnostic) => diagnostic.code === 'supported-allof-object-merge')
  const rest = diagnostics.filter((diagnostic) => diagnostic.code !== 'supported-allof-object-merge')
  if (supportedAllOf.length <= 1) return diagnostics

  return [
    ...rest,
    {
      severity: 'warning',
      code: 'supported-allof-object-merge',
      message: `${supportedAllOf.length} schemas use simple object allOf composition that can be merged safely.`,
      location: supportedAllOf
        .map((diagnostic) => diagnostic.location)
        .filter(Boolean)
        .slice(0, 5)
        .join(', ') + (supportedAllOf.length > 5 ? ', ...' : ''),
      impact: 'Repeated safe allOf merge notes are grouped to keep diagnostics readable.',
      suggestion: 'Review generated merged types where needed; complex allOf semantics remain outside public-preview support.',
    },
  ]
}

function isJsonCompatibleContentType(contentType: string): boolean {
  const normalized = contentType.split(';')[0]?.trim().toLowerCase() ?? ''
  return normalized === 'application/json' || normalized.endsWith('+json')
}
