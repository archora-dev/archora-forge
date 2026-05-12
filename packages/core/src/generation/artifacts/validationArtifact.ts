import type { NormalizedOpenApi, OpenApiSchema } from '../../openapi/openapi.types.js'
import type { DetectedResource } from '../../resources/resources.types.js'
import { resolveSchema } from '../typeGeneration.js'

export type ValidationMode = 'zod' | 'valibot'

export function createValidationSchemas(
  normalized: NormalizedOpenApi,
  resourceName: string,
  resource: DetectedResource,
  validation: ValidationMode,
): string {
  if (validation === 'valibot') {
    return `// Valibot generation is reserved for a later adapter pass.\nexport const ${resourceName}Validation = {\n  adapter: 'valibot',\n  supported: false,\n} as const\n`
  }

  const createSchema = resolveSchema(normalized, resource.operations.create?.requestBodySchema)
  const updateSchema = resolveSchema(normalized, resource.operations.update?.requestBodySchema)
  const entity = resource.entity.charAt(0).toLowerCase() + resource.entity.slice(1)

  return `import { z } from 'zod'\n\nexport const create${resource.entity}Schema = ${schemaToZod(normalized, createSchema)}\n\nexport const update${resource.entity}Schema = ${schemaToZod(normalized, updateSchema)}\n\nexport const ${entity}ValidationSchemas = {\n  create: create${resource.entity}Schema,\n  update: update${resource.entity}Schema,\n} as const\n`
}

function schemaToZod(normalized: NormalizedOpenApi, schema: OpenApiSchema | null | undefined): string {
  const resolved = resolveSchema(normalized, schema)
  if (!resolved) return 'z.object({}).passthrough()'
  if (resolved.enum?.length) return `z.enum([${resolved.enum.map((value) => `'${value}'`).join(', ')}])${resolved.nullable ? '.nullable()' : ''}`
  if (resolved.type === 'string') return zodString(resolved)
  if (resolved.type === 'integer') return appendNullable('z.number().int()', resolved)
  if (resolved.type === 'number') return appendNullable(zodNumber(resolved), resolved)
  if (resolved.type === 'boolean') return appendNullable('z.boolean()', resolved)
  if (resolved.type === 'array') return appendNullable(`z.array(${schemaToZod(normalized, resolved.items)})`, resolved)
  if (resolved.type === 'object' || resolved.properties) {
    const required = new Set(resolved.required ?? [])
    const fields = Object.entries(resolved.properties ?? {})
      .map(([name, property]) => {
        const base = schemaToZod(normalized, property)
        const optional = required.has(name) ? base : `${base}.optional()`
        return `  ${toCodeKey(name)}: ${optional},`
      })
      .join('\n')

    return appendNullable(`z.object({\n${fields}\n})`, resolved)
  }

  return appendNullable('z.unknown()', resolved)
}

function zodString(schema: OpenApiSchema): string {
  let expression = 'z.string()'
  if (schema.format === 'email') expression += '.email()'
  if (schema.minLength !== undefined) expression += `.min(${schema.minLength})`
  if (schema.maxLength !== undefined) expression += `.max(${schema.maxLength})`
  return appendNullable(expression, schema)
}

function zodNumber(schema: OpenApiSchema): string {
  let expression = 'z.number()'
  if (schema.minimum !== undefined) expression += `.min(${schema.minimum})`
  if (schema.maximum !== undefined) expression += `.max(${schema.maximum})`
  return expression
}

function appendNullable(expression: string, schema: OpenApiSchema): string {
  return schema.nullable ? `${expression}.nullable()` : expression
}

function toCodeKey(value: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(value) ? value : JSON.stringify(value)
}
