import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { GeneratedFile } from '../generation/generation.types.js'

export type WriteGeneratedFilesOptions = {
  cwd: string
  dryRun: boolean
}

export type WriteGeneratedFilesResult = {
  created: number
  updated: number
  protected: number
}

export async function writeGeneratedFiles(
  files: GeneratedFile[],
  options: WriteGeneratedFilesOptions,
): Promise<WriteGeneratedFilesResult> {
  const result: WriteGeneratedFilesResult = {
    created: 0,
    updated: 0,
    protected: 0,
  }

  for (const file of files) {
    if (file.exists && !file.overwrite) {
      result.protected += 1
      continue
    }

    if (file.exists) {
      result.updated += 1
    } else {
      result.created += 1
    }

    if (options.dryRun) {
      continue
    }

    const absolutePath = join(options.cwd, file.path)
    await mkdir(dirname(absolutePath), { recursive: true })
    await writeFile(absolutePath, file.content, 'utf8')
  }

  return result
}
