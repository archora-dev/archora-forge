export type SchemaHealthWarning = {
  code: string
  message: string
  target?: string
}

export type SchemaHealthReport = {
  score: number
  endpointCount: number
  schemaCount: number
  tagCount: number
  crudCandidateCount: number
  enumCount: number
  warnings: SchemaHealthWarning[]
}
