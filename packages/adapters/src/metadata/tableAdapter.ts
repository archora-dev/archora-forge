export const metadataTableAdapter = {
  string: 'text',
  number: 'number',
  boolean: 'boolean',
  enum: 'badge',
  date: 'date',
  dateTime: 'dateTime',
  object: 'json',
} as const

export type MetadataTableSchema = {
  type?: string
  format?: string
  enum?: readonly string[]
}

export type MetadataTableCell = (typeof metadataTableAdapter)[keyof typeof metadataTableAdapter]

export function mapMetadataTableCell(schema: MetadataTableSchema): MetadataTableCell {
  if (schema.enum) return metadataTableAdapter.enum
  if (schema.format === 'date') return metadataTableAdapter.date
  if (schema.format === 'date-time') return metadataTableAdapter.dateTime
  if (schema.type === 'boolean') return metadataTableAdapter.boolean
  if (schema.type === 'number' || schema.type === 'integer') return metadataTableAdapter.number
  if (schema.type === 'object' || schema.type === 'array') return metadataTableAdapter.object
  return metadataTableAdapter.string
}
