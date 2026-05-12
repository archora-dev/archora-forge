import { toFilterFields, toFormFields, toTableColumns } from '@archora/forge-adapters'

import { usersConfig } from './generated/users.config.js'

type InternalTableColumn = {
  dataIndex: string
  title: string
  sortable: boolean
  renderer: string
}

type InternalFormField = {
  name: string
  label: string
  control: string
  required: boolean
  options?: readonly string[]
}

type InternalFilterField = {
  name: string
  label: string
  control: string
  options?: readonly string[]
}

export function createUsersTableColumns(): InternalTableColumn[] {
  return toTableColumns(usersConfig.columns).map((column) => ({
    dataIndex: column.key,
    title: column.title,
    sortable: column.sortable,
    renderer: column.cell,
  }))
}

export function createUsersFormFields(): InternalFormField[] {
  return toFormFields(usersConfig.fields).map((field) => ({
    name: field.key,
    label: field.label,
    control: field.input,
    required: field.required,
    ...(field.options ? { options: field.options } : {}),
  }))
}

export function createUsersFilterFields(): InternalFilterField[] {
  return toFilterFields(usersConfig.filters).map((field) => ({
    name: field.key,
    label: field.label,
    control: field.input,
    ...(field.options ? { options: field.options } : {}),
  }))
}
