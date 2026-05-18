import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

import type { GeneratedFile } from '../generation/generation.types.js'
import { forgeCoreVersion } from '../version.js'

export const forgeGeneratedMarker = '// @archora-forge-generated'
export const forgeGeneratedMetadataMarker = '// @archora-forge-meta'

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

export type PrunableGeneratedFile = {
  path: string
}

export type PruneGeneratedFilesResult = {
  deleted: PrunableGeneratedFile[]
  skipped: Array<PrunableGeneratedFile & { reason: string }>
}

export type GeneratorMetadataMismatch = {
  path: string
  expected: string
  actual: string | null
}

export type GeneratorMetadataSummary = {
  status: 'current' | 'missing-metadata' | 'mismatch'
  version: string
  files: {
    total: number
    missingMetadata: PrunableGeneratedFile[]
    versionMismatches: GeneratorMetadataMismatch[]
    schemaHashMismatches: GeneratorMetadataMismatch[]
    configHashMismatches: GeneratorMetadataMismatch[]
  }
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
    const content = toWritableGeneratedContent(file)
    if (file.exists && !file.overwrite) {
      result.protected += 1
      continue
    }

    const absolutePath = join(options.cwd, file.path)
    if (file.exists && (await readExistingFile(absolutePath)) === content) {
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
    await writeFile(absolutePath, content, 'utf8')
  }

  return result
}

export function toWritableGeneratedContent(file: GeneratedFile): string {
  if (file.kind !== 'generated' || !file.path.endsWith('.ts')) {
    return file.content
  }

  const contentWithoutHeaders = stripGeneratedHeaders(file.content)
  return `${forgeGeneratedMarker}\n${formatGeneratedMetadata(file)}${contentWithoutHeaders}`
}

export function readGeneratedFileMetadata(content: string): GeneratedFile['metadata'] | null {
  const line = content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .find((entry) => entry.startsWith(`${forgeGeneratedMetadataMarker} `))
  if (!line) return null

  try {
    const parsed = JSON.parse(line.slice(forgeGeneratedMetadataMarker.length + 1)) as Partial<NonNullable<GeneratedFile['metadata']>>
    if (typeof parsed.version !== 'string' || typeof parsed.schemaHash !== 'string' || typeof parsed.configHash !== 'string') return null
    return {
      version: parsed.version,
      schemaHash: parsed.schemaHash,
      configHash: parsed.configHash,
    }
  } catch {
    return null
  }
}

export async function summarizeGeneratorMetadata(files: GeneratedFile[], options: { cwd: string }): Promise<GeneratorMetadataSummary> {
  const summary: GeneratorMetadataSummary = {
    status: 'current',
    version: forgeCoreVersion,
    files: {
      total: files.filter((file) => file.kind === 'generated').length,
      missingMetadata: [],
      versionMismatches: [],
      schemaHashMismatches: [],
      configHashMismatches: [],
    },
  }

  for (const file of files) {
    if (file.kind !== 'generated') continue
    const expected = file.metadata
    const content = await readExistingFile(join(options.cwd, file.path))
    const actual = content ? readGeneratedFileMetadata(content) : null
    if (!expected || !actual) {
      summary.files.missingMetadata.push({ path: file.path })
      continue
    }
    if (actual.version !== expected.version) {
      summary.files.versionMismatches.push({ path: file.path, expected: expected.version, actual: actual.version })
    }
    if (actual.schemaHash !== expected.schemaHash) {
      summary.files.schemaHashMismatches.push({ path: file.path, expected: expected.schemaHash, actual: actual.schemaHash })
    }
    if (actual.configHash !== expected.configHash) {
      summary.files.configHashMismatches.push({ path: file.path, expected: expected.configHash, actual: actual.configHash })
    }
  }

  const mismatchCount =
    summary.files.versionMismatches.length + summary.files.schemaHashMismatches.length + summary.files.configHashMismatches.length
  summary.status = mismatchCount > 0 ? 'mismatch' : summary.files.missingMetadata.length > 0 ? 'missing-metadata' : 'current'

  return summary
}

function formatGeneratedMetadata(file: GeneratedFile): string {
  if (!file.metadata) return ''
  return `${forgeGeneratedMetadataMarker} ${JSON.stringify(file.metadata)}\n`
}

function stripGeneratedHeaders(content: string): string {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  while (lines[0] === forgeGeneratedMarker || lines[0]?.startsWith(`${forgeGeneratedMetadataMarker} `)) {
    lines.shift()
  }
  return lines.join('\n')
}

export async function findPrunableGeneratedFiles(
  files: GeneratedFile[],
  options: { cwd: string; roots: string[] },
): Promise<PrunableGeneratedFile[]> {
  const planned = new Set(files.map((file) => normalizePath(file.path)))
  const candidates: PrunableGeneratedFile[] = []
  const seen = new Set<string>()

  for (const root of options.roots) {
    const absoluteRoot = resolveRoot(options.cwd, root)
    for (const absolutePath of await listFiles(absoluteRoot)) {
      const path = normalizePath(relative(options.cwd, absolutePath))
      if (seen.has(path) || planned.has(path)) continue
      seen.add(path)

      const content = await readExistingFile(absolutePath)
      if (!content?.startsWith(forgeGeneratedMarker)) continue

      candidates.push({ path })
    }
  }

  return candidates.sort((left, right) => left.path.localeCompare(right.path))
}

export async function pruneGeneratedFiles(
  candidates: PrunableGeneratedFile[],
  options: { cwd: string; dryRun: boolean },
): Promise<PruneGeneratedFilesResult> {
  const result: PruneGeneratedFilesResult = { deleted: [], skipped: [] }

  for (const candidate of candidates) {
    if (options.dryRun) continue
    try {
      await rm(resolve(options.cwd, candidate.path), { force: false })
      result.deleted.push(candidate)
    } catch (error) {
      result.skipped.push({ ...candidate, reason: error instanceof Error ? error.message : String(error) })
    }
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

async function listFiles(root: string): Promise<string[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true })
    const nested = await Promise.all(
      entries.map(async (entry) => {
        const path = join(root, entry.name)
        if (entry.isDirectory()) return listFiles(path)
        if (entry.isFile()) return [path]
        return []
      }),
    )
    return nested.flat()
  } catch {
    return []
  }
}

function resolveRoot(cwd: string, root: string): string {
  return isAbsolute(root) ? root : resolve(cwd, root)
}

function normalizePath(path: string): string {
  return path.split(sep).join('/')
}
