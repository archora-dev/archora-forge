import type { ForgeDiagnostic } from '../diagnostics/diagnostics.js'
import { collectDiagnostics } from '../diagnostics/diagnostics.js'
import { toSafeIdentifier } from '../generation/identifiers.js'
import type { NormalizedOpenApi } from '../openapi/openapi.types.js'
import { extractPathParameters } from '../openapi/pathTemplate.js'

export type OpenApiLintOptions = {
  strict?: boolean
  disabledRules?: string[]
}

export type OpenApiLintReport = {
  ok: boolean
  score: number
  diagnostics: ForgeDiagnostic[]
  grouped: Record<string, ForgeDiagnostic[]>
}

export function lintOpenApi(normalized: NormalizedOpenApi, options: OpenApiLintOptions = {}): OpenApiLintReport {
  const disabled = new Set(options.disabledRules ?? [])
  const diagnostics: ForgeDiagnostic[] = []
  const operationIds = new Map<string, string[]>()

  for (const operation of normalized.operations) {
    const location = `${operation.method.toUpperCase()} ${operation.path}`
    if (operation.operation.operationId) {
      operationIds.set(operation.operation.operationId, [...(operationIds.get(operation.operation.operationId) ?? []), location])
    }
    if (!operation.operation.operationId) {
      diagnostics.push({
        severity: 'warning',
        code: 'missing-operation-id',
        message: `${location} does not define operationId.`,
        location,
        suggestion: 'Add a stable operationId so generated method names do not depend on fallback naming.',
      })
    }
    if (operation.tags.length === 0) {
      diagnostics.push({
        severity: 'warning',
        code: 'missing-tags',
        message: `${location} has no tags, so resource detection is less precise.`,
        location,
        suggestion: 'Add a resource tag such as Users, Orders or Reports.',
      })
    }
    if (operation.tags.length > 1) {
      diagnostics.push({
        severity: 'warning',
        code: 'multiple-resource-tags',
        message: `${location} has multiple tags, so resource ownership is ambiguous.`,
        location,
        suggestion: 'Use one primary resource tag and move secondary grouping into summary or operationId naming.',
      })
    }
    for (const name of extractPathParameters(operation.path)) {
      if (!operation.parameters.some((parameter) => parameter.in === 'path' && parameter.name === name)) {
        diagnostics.push({
          severity: 'warning',
          code: 'path-template-parameter-missing',
          message: `${location} uses path parameter "${name}" without a matching OpenAPI path parameter.`,
          location,
          suggestion: 'Define every path template parameter with in: path and required: true.',
        })
      }
    }
    if ((operation.method === 'post' || operation.method === 'put' || operation.method === 'patch') && !operation.requestBodySchema) {
      diagnostics.push({
        severity: 'warning',
        code: 'missing-request-schema',
        message: `${location} has no JSON request schema.`,
        location,
        suggestion: 'Add an application/json request schema for typed generated payloads.',
      })
    }
    if (operation.method !== 'delete' && !operation.responseSchema && !operation.responseBodyEmpty) {
      diagnostics.push({
        severity: 'warning',
        code: 'missing-response-schema',
        message: `${location} has no 2xx JSON response schema.`,
        location,
        suggestion: 'Add an application/json 2xx response schema for typed generated responses.',
      })
    }
    if (!operation.hasErrorResponse) {
      diagnostics.push({
        severity: 'warning',
        code: 'missing-error-response',
        message: `${location} does not document a 4xx or 5xx response.`,
        location,
        suggestion: 'Document common error responses so frontend clients can model failure states.',
      })
    }
    if (operation.operation.operationId && toSafeIdentifier(operation.operation.operationId, 'operation') !== operation.operation.operationId) {
      diagnostics.push({
        severity: 'warning',
        code: 'unsafe-identifiers',
        message: `${location} has an operationId that must be sanitized for TypeScript output.`,
        location,
        suggestion: 'Use alphanumeric camelCase operationId values when possible.',
      })
    }
  }

  for (const [operationId, locations] of operationIds) {
    if (locations.length < 2) continue
    diagnostics.push({
      severity: 'warning',
      code: 'duplicate-operation-id',
      message: `operationId "${operationId}" is used by ${locations.length} operations.`,
      location: locations.slice(0, 3).join(', ') + (locations.length > 3 ? ', ...' : ''),
      suggestion: 'Use stable unique operationId values so generated method names do not require collision suffixes.',
    })
  }

  diagnostics.push(...collectDiagnostics(normalized))

  const filtered = dedupeDiagnostics(diagnostics.filter((diagnostic) => !disabled.has(diagnostic.code)))
  const grouped = filtered.reduce<Record<string, ForgeDiagnostic[]>>((groups, diagnostic) => {
    groups[diagnostic.code] = [...(groups[diagnostic.code] ?? []), diagnostic]
    return groups
  }, {})
  const errors = filtered.filter((diagnostic) => diagnostic.severity === 'error').length
  const warnings = filtered.length - errors
  const ruleCount = Object.keys(grouped).length
  const score = Math.max(0, 100 - errors * 20 - ruleCount * 6 - warnings)
  const ok = options.strict ? filtered.length === 0 : errors === 0

  return { ok, score, diagnostics: filtered, grouped }
}

function dedupeDiagnostics(diagnostics: ForgeDiagnostic[]): ForgeDiagnostic[] {
  const seen = new Set<string>()
  const deduped: ForgeDiagnostic[] = []

  for (const diagnostic of diagnostics) {
    const key = `${diagnostic.code}:${diagnostic.location ?? diagnostic.message}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(diagnostic)
  }

  return deduped
}
