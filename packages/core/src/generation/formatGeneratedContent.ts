import { format } from 'prettier'

export async function formatGeneratedContent(path: string, content: string): Promise<string> {
  const parser = getParser(path)
  if (!parser) {
    return content
  }

  try {
    return await format(content, {
      parser,
      singleQuote: true,
      semi: false,
      trailingComma: 'all',
      printWidth: 100,
    })
  } catch {
    return content
  }
}

function getParser(path: string): 'typescript' | null {
  if (path.endsWith('.ts')) return 'typescript'
  return null
}
