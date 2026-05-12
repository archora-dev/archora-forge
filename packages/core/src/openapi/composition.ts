import type { OpenApiDocument, OpenApiSchema } from './openapi.types.js'

export type AllOfAnalysis =
  | { kind: 'mergeable' }
  | { kind: 'conflicting'; property: string; reason: string }
  | { kind: 'unsupported'; reason: string }

export function analyzeAllOfSchema(document: OpenApiDocument, schema: OpenApiSchema): AllOfAnalysis {
  if (!schema.allOf) return { kind: 'unsupported', reason: 'Schema does not use allOf.' }

  const analysis = mergeAllOfBranches(document, schema.allOf, new Set())
  if (analysis.kind === 'mergeable') return { kind: 'mergeable' }
  return analysis
}

export function mergeSimpleAllOfSchema(document: OpenApiDocument, schema: OpenApiSchema): OpenApiSchema | null {
  if (!schema.allOf) return schema

  const analysis = mergeAllOfBranches(document, schema.allOf, new Set())
  if (analysis.kind !== 'mergeable') return null

  return {
    ...schema,
    type: 'object',
    properties: analysis.properties,
    required: analysis.required.length > 0 ? analysis.required : undefined,
  }
}

type MergeResult =
  | {
      kind: 'mergeable'
      properties: Record<string, OpenApiSchema>
      required: string[]
    }
  | { kind: 'conflicting'; property: string; reason: string }
  | { kind: 'unsupported'; reason: string }

function mergeAllOfBranches(document: OpenApiDocument, branches: OpenApiSchema[], seenRefs: Set<string>): MergeResult {
  const properties: Record<string, OpenApiSchema> = {}
  const required = new Set<string>()

  for (const branch of branches) {
    const resolved = resolveBranch(document, branch, seenRefs)
    if (!resolved) {
      return { kind: 'unsupported', reason: 'A branch references an unknown or circular schema.' }
    }
    if (!isObjectLikeSchema(resolved)) {
      return { kind: 'unsupported', reason: 'Only object allOf branches can be merged safely.' }
    }

    for (const [name, property] of Object.entries(resolved.properties ?? {})) {
      const existing = properties[name]
      if (existing && !areCompatibleProperties(existing, property)) {
        return {
          kind: 'conflicting',
          property: name,
          reason: `Property "${name}" is defined with incompatible schema constraints across allOf branches.`,
        }
      }
      properties[name] = property
    }
    for (const name of resolved.required ?? []) {
      required.add(name)
    }
  }

  return {
    kind: 'mergeable',
    properties,
    required: [...required],
  }
}

function resolveBranch(document: OpenApiDocument, branch: OpenApiSchema, seenRefs: Set<string>): OpenApiSchema | null {
  const resolved = branch.$ref ? resolveRef(document, branch.$ref, seenRefs) : branch
  if (!resolved) return null
  if (!resolved.allOf) return resolved

  const merged = mergeSimpleAllOfSchema(document, resolved)
  return merged ?? resolved
}

function resolveRef(document: OpenApiDocument, ref: string, seenRefs: Set<string>): OpenApiSchema | null {
  if (seenRefs.has(ref)) return null
  seenRefs.add(ref)
  const name = ref.startsWith('#/components/schemas/') ? ref.split('/').at(-1) : null
  const schema = name ? document.components?.schemas?.[name] : null
  if (!schema) return null
  return schema.$ref || schema.allOf ? resolveBranch(document, schema, seenRefs) : schema
}

function isObjectLikeSchema(schema: OpenApiSchema): boolean {
  return schema.type === 'object' || Boolean(schema.properties)
}

function areCompatibleProperties(left: OpenApiSchema, right: OpenApiSchema): boolean {
  return (
    left.type === right.type &&
    left.format === right.format &&
    Boolean(left.nullable) === Boolean(right.nullable) &&
    JSON.stringify(left.enum ?? null) === JSON.stringify(right.enum ?? null)
  )
}
