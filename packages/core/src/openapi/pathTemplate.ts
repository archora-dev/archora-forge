export function extractPathParameters(path: string): string[] {
  const params: string[] = []

  forEachPathParameter(path, (name) => {
    params.push(name)
  })

  return params
}

export function hasPathParameters(path: string): boolean {
  let found = false
  forEachPathParameter(path, () => {
    found = true
  })
  return found
}

export function renderPathTemplate(path: string, renderParameter: (name: string) => string): string {
  let output = ''
  let cursor = 0

  forEachPathParameter(path, (name, start, end) => {
    output += path.slice(cursor, start)
    output += renderParameter(name)
    cursor = end + 1
  })

  return output + path.slice(cursor)
}

function forEachPathParameter(path: string, visit: (name: string, start: number, end: number) => void): void {
  let index = 0

  while (index < path.length) {
    const start = path.indexOf('{', index)
    if (start === -1) return

    const end = path.indexOf('}', start + 1)
    if (end === -1) return

    const name = path.slice(start + 1, end)
    if (name.length > 0) {
      visit(name, start, end)
    }

    index = end + 1
  }
}
