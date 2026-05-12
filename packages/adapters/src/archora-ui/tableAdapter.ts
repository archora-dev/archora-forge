export const archoraUiTableAdapter = {
  string: 'text',
  number: 'number',
  boolean: 'boolean',
  enum: 'badge',
  date: 'date',
  dateTime: 'dateTime',
  object: 'json',
} as const

export type ArchoraUiTableSchema = {
  type?: string
  format?: string
  enum?: readonly string[]
}

export type ArchoraUiTableCell = (typeof archoraUiTableAdapter)[keyof typeof archoraUiTableAdapter]

export function mapArchoraUiTableCell(schema: ArchoraUiTableSchema): ArchoraUiTableCell {
  if (schema.enum) return archoraUiTableAdapter.enum
  if (schema.format === 'date') return archoraUiTableAdapter.date
  if (schema.format === 'date-time') return archoraUiTableAdapter.dateTime
  if (schema.type === 'boolean') return archoraUiTableAdapter.boolean
  if (schema.type === 'number' || schema.type === 'integer') return archoraUiTableAdapter.number
  if (schema.type === 'object' || schema.type === 'array') return archoraUiTableAdapter.object
  return archoraUiTableAdapter.string
}
