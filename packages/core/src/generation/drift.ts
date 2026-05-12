import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { GeneratedFile } from './generation.types.js'

export type DriftEntry = {
  path: string
  kind: 'missing' | 'outdated'
}

export async function calculateDrift(files: GeneratedFile[], options: { cwd: string }): Promise<DriftEntry[]> {
  const drift: DriftEntry[] = []
  for (const file of files) {
    if (file.kind !== 'generated') continue
    const absolutePath = join(options.cwd, file.path)
    try {
      const current = await readFile(absolutePath, 'utf8')
      if (normalize(current) !== normalize(file.content)) {
        drift.push({ path: file.path, kind: 'outdated' })
      }
    } catch {
      drift.push({ path: file.path, kind: 'missing' })
    }
  }

  return drift
}

function normalize(value: string): string {
  return value.replace(/\r\n/g, '\n').trimEnd()
}
