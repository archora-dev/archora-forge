export const metadataFieldAdapter = {
  string: 'text',
  number: 'number',
  boolean: 'switch',
  enum: 'select',
  date: 'date',
  dateTime: 'dateTime',
  textarea: 'textarea',
} as const

export type MetadataFieldSchema = {
  type?: string
  format?: string
  enum?: readonly string[]
  maxLength?: number
}

export type MetadataFieldMapping = {
  input: 'text' | 'email' | 'url' | 'number' | 'switch' | 'select' | 'date' | 'dateTime' | 'textarea'
  component: (typeof metadataFieldAdapter)[keyof typeof metadataFieldAdapter]
}

export function mapMetadataField(schema: MetadataFieldSchema): MetadataFieldMapping {
  if (schema.enum) {
    return { input: 'select', component: metadataFieldAdapter.enum }
  }
  if (schema.format === 'email') {
    return { input: 'email', component: metadataFieldAdapter.string }
  }
  if (schema.format === 'uri') {
    return { input: 'url', component: metadataFieldAdapter.string }
  }
  if (schema.format === 'date') {
    return { input: 'date', component: metadataFieldAdapter.date }
  }
  if (schema.format === 'date-time') {
    return { input: 'dateTime', component: metadataFieldAdapter.dateTime }
  }
  if (schema.type === 'number' || schema.type === 'integer') {
    return { input: 'number', component: metadataFieldAdapter.number }
  }
  if (schema.type === 'boolean') {
    return { input: 'switch', component: metadataFieldAdapter.boolean }
  }
  if ((schema.maxLength ?? 0) > 160) {
    return { input: 'textarea', component: metadataFieldAdapter.textarea }
  }

  return { input: 'text', component: metadataFieldAdapter.string }
}
