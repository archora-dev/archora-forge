const identifierPattern = /^[A-Za-z_$][\w$]*$/
const reservedWords = new Set([
  'abstract',
  'any',
  'as',
  'async',
  'await',
  'boolean',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'constructor',
  'continue',
  'debugger',
  'declare',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'from',
  'function',
  'get',
  'if',
  'implements',
  'import',
  'in',
  'infer',
  'instanceof',
  'interface',
  'is',
  'keyof',
  'let',
  'module',
  'namespace',
  'never',
  'new',
  'null',
  'number',
  'object',
  'of',
  'package',
  'private',
  'protected',
  'public',
  'readonly',
  'require',
  'return',
  'set',
  'static',
  'string',
  'super',
  'switch',
  'symbol',
  'this',
  'throw',
  'true',
  'try',
  'type',
  'typeof',
  'undefined',
  'unique',
  'unknown',
  'var',
  'void',
  'while',
  'with',
  'yield',
])

const cyrillicMap: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'c',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
}

export function toSafeIdentifier(value: string, fallback = 'value'): string {
  const parts = transliterate(value)
    .trim()
    .split(/[^A-Za-z0-9_$]+/)
    .filter(Boolean)

  const identifier =
    parts.length === 0
      ? fallback
      : parts
          .map((part, index) => {
            const cleaned = part.replace(/[^\w$]/g, '')
            if (!cleaned) return ''
            if (index === 0) return cleaned.charAt(0).toLowerCase() + cleaned.slice(1)
            return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
          })
          .join('')

  const safe = ensureIdentifierStart(identifier || fallback)
  return avoidReservedWord(identifierPattern.test(safe) ? safe : ensureIdentifierStart(fallback))
}

export function toSafeTypeName(value: string, fallback = 'GeneratedType'): string {
  const identifier = toSafeIdentifier(value, fallback)
  const pascal = identifier.charAt(0).toUpperCase() + identifier.slice(1)
  return avoidReservedWord(identifierPattern.test(pascal) ? pascal : toSafeIdentifier(fallback, 'GeneratedType'))
}

export function toSafeFileName(value: string, fallback = 'file'): string {
  return toSafeIdentifier(value, fallback)
}

export function pluralizeTypeName(value: string): string {
  if (/(s|x|z|ch|sh)$/i.test(value)) return `${value}es`
  if (/[^aeiou]y$/i.test(value)) return `${value.slice(0, -1)}ies`
  return `${value}s`
}

export function createIdentifierRegistry(): {
  identifier: (value: string, fallback?: string) => string
  typeName: (value: string, fallback?: string) => string
  fileName: (value: string, fallback?: string) => string
} {
  const used = new Set<string>()
  const unique = (name: string): string => {
    let candidate = name
    let index = 2
    while (used.has(candidate)) {
      candidate = `${name}${index}`
      index += 1
    }
    used.add(candidate)
    return candidate
  }

  return {
    identifier: (value, fallback) => unique(toSafeIdentifier(value, fallback)),
    typeName: (value, fallback) => unique(toSafeTypeName(value, fallback)),
    fileName: (value, fallback) => unique(toSafeFileName(value, fallback)),
  }
}

export function quoteObjectKeyIfNeeded(value: string): string {
  return identifierPattern.test(value) ? value : `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

export function isSafeIdentifier(value: string): boolean {
  return identifierPattern.test(value)
}

function ensureIdentifierStart(value: string): string {
  if (!value) return '_'
  return /^[A-Za-z_$]/.test(value) ? value : `_${value}`
}

function avoidReservedWord(value: string): string {
  return reservedWords.has(value) ? `${value}Value` : value
}

function transliterate(value: string): string {
  return [...value]
    .map((char) => {
      const lower = char.toLowerCase()
      const transliterated = cyrillicMap[lower]
      if (transliterated == null) return char
      return char === lower ? transliterated : capitalize(transliterated)
    })
    .join('')
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
