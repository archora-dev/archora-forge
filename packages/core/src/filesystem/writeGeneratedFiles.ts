import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { GeneratedFile } from '../generation/generation.types.js'

export type WriteGeneratedFilesOptions = {
  cwd: string
  dryRun: boolean
}

export type WriteGeneratedFilesResult = {
  created: number
  updated: number
  unchanged: number
  protected: number
}

export async function writeGeneratedFiles(
  files: GeneratedFile[],
  options: WriteGeneratedFilesOptions,
): Promise<WriteGeneratedFilesResult> {
  const result: WriteGeneratedFilesResult = {
    created: 0,
    updated: 0,
    unchanged: 0,
    protected: 0,
  }

  for (const file of files) {
    if (file.exists && !file.overwrite) {
      result.protected += 1
      continue
    }

    const absolutePath = join(options.cwd, file.path)
    if (file.exists && (await readExistingFile(absolutePath)) === file.content) {
      result.unchanged += 1
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

    await mkdir(dirname(absolutePath), { recursive: true })
    await writeFile(absolutePath, file.content, 'utf8')
  }

  return result
}

async function readExistingFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return null
  }
}
