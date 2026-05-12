export const archoraUiFieldAdapter = {
  string: 'ArchInput',
  number: 'ArchInput',
  boolean: 'ArchSwitch',
  enum: 'ArchSelect',
  date: 'ArchDatePicker',
  dateTime: 'ArchDatePicker',
  textarea: 'ArchTextarea',
} as const

export type ArchoraUiFieldSchema = {
  type?: string
  format?: string
  enum?: readonly string[]
  maxLength?: number
}

export type ArchoraUiFieldMapping = {
  input: 'text' | 'email' | 'number' | 'switch' | 'select' | 'date' | 'dateTime' | 'textarea'
  component: (typeof archoraUiFieldAdapter)[keyof typeof archoraUiFieldAdapter]
}

export function mapArchoraUiField(schema: ArchoraUiFieldSchema): ArchoraUiFieldMapping {
  if (schema.enum) {
    return { input: 'select', component: archoraUiFieldAdapter.enum }
  }
  if (schema.format === 'email') {
    return { input: 'email', component: archoraUiFieldAdapter.string }
  }
  if (schema.format === 'date') {
    return { input: 'date', component: archoraUiFieldAdapter.date }
  }
  if (schema.format === 'date-time') {
    return { input: 'dateTime', component: archoraUiFieldAdapter.dateTime }
  }
  if (schema.type === 'number' || schema.type === 'integer') {
    return { input: 'number', component: archoraUiFieldAdapter.number }
  }
  if (schema.type === 'boolean') {
    return { input: 'switch', component: archoraUiFieldAdapter.boolean }
  }
  if ((schema.maxLength ?? 0) > 160) {
    return { input: 'textarea', component: archoraUiFieldAdapter.textarea }
  }

  return { input: 'text', component: archoraUiFieldAdapter.string }
}
