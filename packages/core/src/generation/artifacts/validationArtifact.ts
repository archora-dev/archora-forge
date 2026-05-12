import type { NormalizedOpenApi, OpenApiSchema } from '../../openapi/openapi.types.js'
import type { DetectedResource } from '../../resources/resources.types.js'
import { resolveSchema, resolveSchemaName } from '../typeGeneration.js'

export type ValidationMode = 'zod' | 'valibot'

export function createValidationSchemas(
  normalized: NormalizedOpenApi,
  resourceName: string,
  resource: DetectedResource,
  validation: ValidationMode,
): string {
  if (validation === 'valibot') {
    const createSchema = resource.operations.create?.requestBodySchema
    const updateSchema = resource.operations.update?.requestBodySchema
    const entity = resource.entity.charAt(0).toLowerCase() + resource.entity.slice(1)

    return `import * as v from 'valibot'\n\nexport const create${resource.entity}Schema = ${schemaToValibot(normalized, createSchema)}\n\nexport const update${resource.entity}Schema = ${schemaToValibot(normalized, updateSchema)}\n\nexport const ${entity}ValidationSchemas = {\n  create: create${resource.entity}Schema,\n  update: update${resource.entity}Schema,\n} as const\n`
  }

  const createSchema = resource.operations.create?.requestBodySchema
  const updateSchema = resource.operations.update?.requestBodySchema
  const entity = resource.entity.charAt(0).toLowerCase() + resource.entity.slice(1)

  return `import { z } from 'zod'\n\nexport const create${resource.entity}Schema = ${schemaToZod(normalized, createSchema)}\n\nexport const update${resource.entity}Schema = ${schemaToZod(normalized, updateSchema)}\n\nexport const ${entity}ValidationSchemas = {\n  create: create${resource.entity}Schema,\n  update: update${resource.entity}Schema,\n} as const\n`
}

function schemaToZod(normalized: NormalizedOpenApi, schema: OpenApiSchema | null | undefined, resolvingRefs: string[] = []): string {
  if (schema?.$ref) {
    const refName = resolveSchemaName(schema)
    if (refName && resolvingRefs.includes(refName)) {
      return appendNullable('z.lazy(() => z.unknown())', schema)
    }

    const resolved = resolveSchema(normalized, schema)
    if (!resolved || resolved === schema) return appendNullable('z.unknown()', schema)

    return schemaToZod(normalized, resolved, refName ? [...resolvingRefs, refName] : resolvingRefs)
  }

  const resolved = resolveSchema(normalized, schema)
  if (!resolved) return 'z.object({}).passthrough()'
  if (Array.isArray(resolved.type)) {
    const normalizedSchema = normalizeNullableTypeArray(resolved)
    if (normalizedSchema) return schemaToZod(normalized, normalizedSchema, resolvingRefs)
    return appendNullable('z.unknown()', resolved)
  }
  if (resolved.oneOf?.length || resolved.anyOf?.length) {
    return appendNullable(createZodUnion(normalized, resolved.oneOf ?? resolved.anyOf ?? [], resolvingRefs), resolved)
  }
  if (hasConst(resolved)) return appendNullable(`z.literal(${JSON.stringify(resolved.const)})`, resolved)
  if (resolved.enum?.length) return appendNullable(createZodEnum(resolved.enum), resolved)
  if (resolved.type === 'string') return zodString(resolved)
  if (resolved.type === 'integer') return appendNullable('z.number().int()', resolved)
  if (resolved.type === 'number') return appendNullable(zodNumber(resolved), resolved)
  if (resolved.type === 'boolean') return appendNullable('z.boolean()', resolved)
  if (resolved.type === 'array') return appendNullable(`z.array(${schemaToZod(normalized, resolved.items, resolvingRefs)})`, resolved)
  if (isPureDictionarySchema(resolved)) {
    return appendNullable(`z.record(z.string(), ${schemaToZodRecordValue(normalized, resolved.additionalProperties, resolvingRefs)})`, resolved)
  }
  if (resolved.type === 'object' || resolved.properties) {
    const required = new Set(resolved.required ?? [])
    const fields = Object.entries(resolved.properties ?? {})
      .map(([name, property]) => {
        const base = schemaToZod(normalized, property, resolvingRefs)
        const optional = required.has(name) ? base : `${base}.optional()`
        return `  ${toCodeKey(name)}: ${optional},`
      })
      .join('\n')

    return appendNullable(`z.object({\n${fields}\n})`, resolved)
  }

  return appendNullable('z.unknown()', resolved)
}

function schemaToValibot(normalized: NormalizedOpenApi, schema: OpenApiSchema | null | undefined, resolvingRefs: string[] = []): string {
  if (schema?.$ref) {
    const refName = resolveSchemaName(schema)
    if (refName && resolvingRefs.includes(refName)) {
      return wrapValibotNullable('v.lazy(() => v.unknown())', schema)
    }

    const resolved = resolveSchema(normalized, schema)
    if (!resolved || resolved === schema) return wrapValibotNullable('v.unknown()', schema)

    return schemaToValibot(normalized, resolved, refName ? [...resolvingRefs, refName] : resolvingRefs)
  }

  const resolved = resolveSchema(normalized, schema)
  if (!resolved) return 'v.looseObject({})'
  if (Array.isArray(resolved.type)) {
    const normalizedSchema = normalizeNullableTypeArray(resolved)
    if (normalizedSchema) return schemaToValibot(normalized, normalizedSchema, resolvingRefs)
    return wrapValibotNullable('v.unknown()', resolved)
  }
  if (resolved.oneOf?.length || resolved.anyOf?.length) {
    return wrapValibotNullable(createValibotUnion(normalized, resolved.oneOf ?? resolved.anyOf ?? [], resolvingRefs), resolved)
  }
  if (hasConst(resolved)) return wrapValibotNullable(`v.literal(${JSON.stringify(resolved.const)})`, resolved)
  if (resolved.enum?.length) {
    return wrapValibotNullable(`v.picklist([${resolved.enum.map((value) => JSON.stringify(value)).join(', ')}])`, resolved)
  }
  if (resolved.type === 'string') return valibotString(resolved)
  if (resolved.type === 'integer') return wrapValibotNullable('v.pipe(v.number(), v.integer())', resolved)
  if (resolved.type === 'number') return wrapValibotNullable(valibotNumber(resolved), resolved)
  if (resolved.type === 'boolean') return wrapValibotNullable('v.boolean()', resolved)
  if (resolved.type === 'array') return wrapValibotNullable(`v.array(${schemaToValibot(normalized, resolved.items, resolvingRefs)})`, resolved)
  if (isPureDictionarySchema(resolved)) {
    return wrapValibotNullable(`v.record(v.string(), ${schemaToValibotRecordValue(normalized, resolved.additionalProperties, resolvingRefs)})`, resolved)
  }
  if (resolved.type === 'object' || resolved.properties) {
    const required = new Set(resolved.required ?? [])
    const fields = Object.entries(resolved.properties ?? {})
      .map(([name, property]) => {
        const base = schemaToValibot(normalized, property, resolvingRefs)
        const optional = required.has(name) ? base : `v.optional(${base})`
        return `  ${toCodeKey(name)}: ${optional},`
      })
      .join('\n')

    return wrapValibotNullable(`v.object({\n${fields}\n})`, resolved)
  }

  return wrapValibotNullable('v.unknown()', resolved)
}

function zodString(schema: OpenApiSchema): string {
  let expression = 'z.string()'
  if (schema.format === 'email') expression += '.email()'
  if (schema.format === 'uuid') expression += '.uuid()'
  if (schema.format === 'uri') expression += '.url()'
  if (schema.format === 'date') expression += '.date()'
  if (schema.format === 'date-time') expression += '.datetime()'
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

function createZodEnum(values: Array<string | number | boolean | null>): string {
  if (values.every((value): value is string => typeof value === 'string')) {
    return `z.enum([${values.map((value) => JSON.stringify(value)).join(', ')}])`
  }

  const literals = values.map((value) => `z.literal(${JSON.stringify(value)})`)
  return literals.length === 1 ? literals[0] ?? 'z.unknown()' : `z.union([${literals.join(', ')}])`
}

function createZodUnion(normalized: NormalizedOpenApi, branches: OpenApiSchema[], resolvingRefs: string[]): string {
  const schemas = branches.map((branch) => schemaToZod(normalized, branch, resolvingRefs))
  if (schemas.length === 0) return 'z.unknown()'
  if (schemas.length === 1) return schemas[0] ?? 'z.unknown()'
  return `z.union([${schemas.join(', ')}])`
}

function valibotString(schema: OpenApiSchema): string {
  const actions: string[] = []
  if (schema.format === 'email') actions.push('v.email()')
  if (schema.format === 'uuid') actions.push('v.uuid()')
  if (schema.format === 'uri') actions.push('v.url()')
  if (schema.format === 'date') actions.push('v.isoDate()')
  if (schema.format === 'date-time') actions.push('v.isoDateTime()')
  if (schema.minLength !== undefined) actions.push(`v.minLength(${schema.minLength})`)
  if (schema.maxLength !== undefined) actions.push(`v.maxLength(${schema.maxLength})`)
  const expression = actions.length === 0 ? 'v.string()' : `v.pipe(v.string(), ${actions.join(', ')})`
  return wrapValibotNullable(expression, schema)
}

function valibotNumber(schema: OpenApiSchema): string {
  const actions: string[] = []
  if (schema.minimum !== undefined) actions.push(`v.minValue(${schema.minimum})`)
  if (schema.maximum !== undefined) actions.push(`v.maxValue(${schema.maximum})`)
  return actions.length === 0 ? 'v.number()' : `v.pipe(v.number(), ${actions.join(', ')})`
}

function wrapValibotNullable(expression: string, schema: OpenApiSchema): string {
  return schema.nullable ? `v.nullable(${expression})` : expression
}

function createValibotUnion(normalized: NormalizedOpenApi, branches: OpenApiSchema[], resolvingRefs: string[]): string {
  const schemas = branches.map((branch) => schemaToValibot(normalized, branch, resolvingRefs))
  if (schemas.length === 0) return 'v.unknown()'
  if (schemas.length === 1) return schemas[0] ?? 'v.unknown()'
  return `v.union([${schemas.join(', ')}])`
}

function isPureDictionarySchema(schema: OpenApiSchema): boolean {
  return Boolean(
    (schema.type === 'object' || schema.additionalProperties !== undefined) &&
      schema.additionalProperties !== undefined &&
      Object.keys(schema.properties ?? {}).length === 0,
  )
}

function normalizeNullableTypeArray(schema: OpenApiSchema): OpenApiSchema | null {
  if (!Array.isArray(schema.type)) return schema
  const nonNullTypes = schema.type.filter((type) => type !== 'null')
  if (nonNullTypes.length !== 1) return null
  return {
    ...schema,
    type: nonNullTypes[0],
    nullable: schema.nullable || schema.type.includes('null'),
  }
}

function schemaToZodRecordValue(
  normalized: NormalizedOpenApi,
  additionalProperties: boolean | OpenApiSchema | undefined,
  resolvingRefs: string[],
): string {
  if (additionalProperties === false) return 'z.never()'
  if (additionalProperties === true || additionalProperties === undefined) return 'z.unknown()'
  return schemaToZod(normalized, additionalProperties, resolvingRefs)
}

function schemaToValibotRecordValue(
  normalized: NormalizedOpenApi,
  additionalProperties: boolean | OpenApiSchema | undefined,
  resolvingRefs: string[],
): string {
  if (additionalProperties === false) return 'v.never()'
  if (additionalProperties === true || additionalProperties === undefined) return 'v.unknown()'
  return schemaToValibot(normalized, additionalProperties, resolvingRefs)
}

function toCodeKey(value: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(value) ? value : JSON.stringify(value)
}

function hasConst(schema: OpenApiSchema): schema is OpenApiSchema & { const: string | number | boolean | null } {
  return Object.hasOwn(schema, 'const')
}
