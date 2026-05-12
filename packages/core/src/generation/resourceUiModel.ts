import type { ForgeResourceConfig } from '@archora/forge-config'

import type { NormalizedOpenApi, NormalizedOperation, OpenApiSchema } from '../openapi/openapi.types.js'
import type { DetectedResource } from '../resources/resources.types.js'

export type FormInputKind = 'text' | 'email' | 'number' | 'switch' | 'select' | 'date' | 'dateTime' | 'password' | 'textarea'
export type TableCellKind = 'text' | 'number' | 'boolean' | 'badge' | 'date' | 'dateTime' | 'json'

export type ResourceFormField = {
  name: string
  label: string
  input: FormInputKind
  component: string
  required: boolean
  nullable: boolean
  enumValues?: string[]
  hint?: string
  validation: {
    minLength?: number
    maxLength?: number
    minimum?: number
    maximum?: number
  }
}

export type ResourceTableColumn = {
  name: string
  label: string
  cell: TableCellKind
  sortable: boolean
  nullable: boolean
  hint?: string
}

export type ResourcePaginationModel = {
  enabled: boolean
  itemsPath?: string
  totalPath?: string
  pagePath?: string
}

export type ResourceUiModel = {
  resourceName: string
  entityName: string
  formFields: ResourceFormField[]
  tableColumns: ResourceTableColumn[]
  pagination: ResourcePaginationModel
}

export type CreateResourceUiModelInput = {
  normalized: NormalizedOpenApi
  resource: DetectedResource
  config?: ForgeResourceConfig
}

export function createResourceUiModel(input: CreateResourceUiModelInput): ResourceUiModel {
  const entitySchema = resolveEntitySchema(input.normalized, input.resource)
  const formSchema = resolveOperationBodySchema(input.normalized, input.resource.operations.create) ?? entitySchema
  const tableSchema = resolveListItemSchema(input.normalized, input.resource.operations.list) ?? entitySchema
  const formRequired = new Set(formSchema?.required ?? entitySchema?.required ?? [])
  const tableProperties = tableSchema?.properties ?? {}
  const formProperties = formSchema?.properties ?? tableProperties

  return {
    resourceName: input.resource.name,
    entityName: input.resource.entity,
    formFields: selectProperties(formProperties, input.config?.form?.fields)
      .filter(([, schema]) => !schema.readOnly)
      .map(([name, schema]) => createFormField(name, schema, formRequired.has(name))),
    tableColumns: selectProperties(tableProperties, input.config?.table?.columns)
      .filter(([, schema]) => !schema.writeOnly)
      .map(([name, schema]) => createTableColumn(name, schema)),
    pagination: detectPagination(input.normalized, input.resource.operations.list),
  }
}

function selectProperties(
  properties: Record<string, OpenApiSchema>,
  explicitOrder: string[] | undefined,
): Array<[string, OpenApiSchema]> {
  if (!explicitOrder || explicitOrder.length === 0) {
    return Object.entries(properties)
  }

  return explicitOrder.flatMap((name) => {
    const schema = properties[name]
    return schema ? ([[name, schema]] as Array<[string, OpenApiSchema]>) : []
  })
}

function createFormField(name: string, schema: OpenApiSchema, required: boolean): ResourceFormField {
  return {
    name,
    label: toLabel(name),
    input: mapFormInput(name, schema),
    component: mapFieldComponent(name, schema),
    required,
    nullable: schema.nullable ?? false,
    enumValues: schema.enum,
    hint: schema.description,
    validation: {
      minLength: schema.minLength,
      maxLength: schema.maxLength,
      minimum: schema.minimum,
      maximum: schema.maximum,
    },
  }
}

function createTableColumn(name: string, schema: OpenApiSchema): ResourceTableColumn {
  return {
    name,
    label: toLabel(name),
    cell: mapTableCell(schema),
    sortable: ['string', 'number', 'integer'].includes(schema.type ?? '') || schema.format === 'date' || schema.format === 'date-time',
    nullable: schema.nullable ?? false,
    hint: schema.description,
  }
}

function mapFormInput(name: string, schema: OpenApiSchema): FormInputKind {
  if (schema.enum) return 'select'
  if (name.toLowerCase().includes('password')) return 'password'
  if (schema.format === 'email') return 'email'
  if (schema.format === 'date') return 'date'
  if (schema.format === 'date-time') return 'dateTime'
  if (schema.type === 'number' || schema.type === 'integer') return 'number'
  if (schema.type === 'boolean') return 'switch'
  if ((schema.maxLength ?? 0) > 160) return 'textarea'
  return 'text'
}

function mapFieldComponent(name: string, schema: OpenApiSchema): string {
  const input = mapFormInput(name, schema)
  if (input === 'select') return 'ArchSelect'
  if (input === 'switch') return 'ArchSwitch'
  if (input === 'date' || input === 'dateTime') return 'ArchDatePicker'
  if (input === 'textarea') return 'ArchTextarea'
  return 'ArchInput'
}

function mapTableCell(schema: OpenApiSchema): TableCellKind {
  if (schema.enum) return 'badge'
  if (schema.format === 'date') return 'date'
  if (schema.format === 'date-time') return 'dateTime'
  if (schema.type === 'boolean') return 'boolean'
  if (schema.type === 'number' || schema.type === 'integer') return 'number'
  if (schema.type === 'object' || schema.type === 'array') return 'json'
  return 'text'
}

function detectPagination(normalized: NormalizedOpenApi, operation: NormalizedOperation | undefined): ResourcePaginationModel {
  const responseSchema = operation?.responseSchema ? resolveSchema(normalized, operation.responseSchema) : null
  const properties = responseSchema?.properties ?? {}
  const itemsPath = properties.items?.type === 'array' ? 'items' : undefined
  const totalPath = properties.total ? 'total' : properties.totalCount ? 'totalCount' : undefined
  const pagePath = properties.page ? 'page' : properties.pageIndex ? 'pageIndex' : undefined

  return {
    enabled: Boolean(itemsPath && totalPath),
    itemsPath,
    totalPath,
    pagePath,
  }
}

function resolveEntitySchema(normalized: NormalizedOpenApi, resource: DetectedResource): OpenApiSchema | null {
  return normalized.schemas.find((schema) => schema.name === resource.entity)?.schema ?? null
}

function resolveOperationBodySchema(normalized: NormalizedOpenApi, operation: NormalizedOperation | undefined): OpenApiSchema | null {
  if (!operation?.requestBodySchema) {
    return null
  }

  return resolveSchema(normalized, operation.requestBodySchema)
}

function resolveListItemSchema(normalized: NormalizedOpenApi, operation: NormalizedOperation | undefined): OpenApiSchema | null {
  if (!operation?.responseSchema) {
    return null
  }

  const responseSchema = resolveSchema(normalized, operation.responseSchema)
  if (responseSchema?.type === 'array' && responseSchema.items) {
    return resolveSchema(normalized, responseSchema.items)
  }

  const items = responseSchema?.properties?.items
  if (items?.type === 'array' && items.items) {
    return resolveSchema(normalized, items.items)
  }

  return responseSchema
}

function resolveSchema(normalized: NormalizedOpenApi, schema: OpenApiSchema): OpenApiSchema {
  if (schema.$ref) {
    const name = schema.$ref.split('/').at(-1)
    return normalized.schemas.find((candidate) => candidate.name === name)?.schema ?? schema
  }

  return schema
}

function toLabel(value: string): string {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]+/g, ' ')
    .replace(/^./, (char) => char.toUpperCase())
    .trim()
}
