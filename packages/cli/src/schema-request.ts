export type SchemaRequestCliOptions = {
  schemaHeader?: string | string[]
}

export function parseSchemaRequestHeaders(
  value: string | string[] | undefined,
): Record<string, string> {
  const entries = Array.isArray(value) ? value : value ? [value] : []
  return Object.fromEntries(entries.map(parseSchemaRequestHeader))
}

function parseSchemaRequestHeader(value: string): [string, string] {
  const separator = findHeaderSeparator(value)
  if (separator === -1) {
    throw new Error(`Invalid schema header "${value}". Expected "name:value" or "name=value".`)
  }

  const name = value.slice(0, separator).trim()
  const headerValue = value.slice(separator + 1).trim()
  if (!name || !headerValue) {
    throw new Error(`Invalid schema header "${value}". Header name and value are required.`)
  }

  return [name, headerValue]
}

function findHeaderSeparator(value: string): number {
  const colon = value.indexOf(':')
  const equals = value.indexOf('=')
  if (colon === -1) return equals
  if (equals === -1) return colon
  return Math.min(colon, equals)
}
