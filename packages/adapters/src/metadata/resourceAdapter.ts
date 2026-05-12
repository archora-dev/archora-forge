export type ResourceTableColumn = {
  name: string
  label: string
  cell: 'text' | 'number' | 'boolean' | 'badge' | 'date' | 'dateTime' | 'json'
  sortable: boolean
  nullable: boolean
  deprecated?: boolean
  hint?: string
}

export type ResourceFormField = {
  name: string
  label: string
  input: 'text' | 'email' | 'url' | 'number' | 'switch' | 'select' | 'date' | 'dateTime' | 'password' | 'textarea'
  component?: string
  required: boolean
  nullable: boolean
  enumValues?: readonly unknown[]
  defaultValue?: unknown
  deprecated?: boolean
  hint?: string
  validation: {
    minLength?: number
    maxLength?: number
    minimum?: number
    maximum?: number
  }
}

export type AdapterTableColumn = {
  key: string
  title: string
  cell: ResourceTableColumn['cell']
  sortable: boolean
  nullable: boolean
  deprecated?: boolean
  hint?: string
}

export type AdapterFormField = {
  key: string
  label: string
  input: ResourceFormField['input']
  required: boolean
  nullable: boolean
  options?: readonly string[]
  defaultValue?: unknown
  deprecated?: boolean
  hint?: string
  validation: ResourceFormField['validation']
}

export type AdapterFilterField = {
  key: string
  label: string
  input: ResourceFormField['input']
  options?: readonly string[]
  defaultValue?: unknown
  deprecated?: boolean
}

export function toTableColumns(columns: readonly ResourceTableColumn[]): AdapterTableColumn[] {
  return columns.map((column) => ({
    key: column.name,
    title: column.label,
    cell: column.cell,
    sortable: column.sortable,
    nullable: column.nullable,
    ...(column.deprecated ? { deprecated: true } : {}),
    ...(column.hint ? { hint: column.hint } : {}),
  }))
}

export function toFormFields(fields: readonly ResourceFormField[]): AdapterFormField[] {
  return fields.map((field) => ({
    key: field.name,
    label: field.label,
    input: field.input,
    required: field.required,
    nullable: field.nullable,
    options: toStringOptions(field.enumValues),
    ...(Object.hasOwn(field, 'defaultValue') ? { defaultValue: field.defaultValue } : {}),
    ...(field.deprecated ? { deprecated: true } : {}),
    ...(field.hint ? { hint: field.hint } : {}),
    validation: field.validation,
  }))
}

export function toFilterFields(fields: readonly ResourceFormField[]): AdapterFilterField[] {
  return fields
    .filter((field) => field.input !== 'password' && field.input !== 'textarea')
    .map((field) => ({
      key: field.name,
      label: field.label,
      input: field.input,
      options: toStringOptions(field.enumValues),
      ...(Object.hasOwn(field, 'defaultValue') ? { defaultValue: field.defaultValue } : {}),
      ...(field.deprecated ? { deprecated: true } : {}),
    }))
}

function toStringOptions(options: readonly unknown[] | undefined): readonly string[] | undefined {
  return options?.map((option) => String(option))
}
