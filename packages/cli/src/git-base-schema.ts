import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export type GitBaseSchema = {
  path: string
  label: string
  base: string
  cleanup: () => Promise<void>
}

export async function readGitBaseSchema(schemaPath: string, options: { base: string; repo?: string }): Promise<GitBaseSchema> {
  const repo = resolve(options.repo ?? process.cwd())
  const absoluteSchemaPath = isAbsolute(schemaPath) ? resolve(schemaPath) : resolve(repo, schemaPath)
  const repoRelativePath = relative(repo, absoluteSchemaPath).split(sep).join('/')

  if (!repoRelativePath || repoRelativePath.startsWith('..') || isAbsolute(repoRelativePath)) {
    throw new Error(`Schema path must be inside the repository when using --base: ${schemaPath}`)
  }

  let stdout: string
  try {
    const result = await execFileAsync('git', ['-C', repo, 'show', `${options.base}:${repoRelativePath}`], {
      maxBuffer: 20 * 1024 * 1024,
      timeout: 15_000,
    })
    stdout = result.stdout
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Cannot read ${repoRelativePath} from git ref "${options.base}". ${message}`)
  }

  const tempDir = await mkdtemp(resolve(tmpdir(), 'archora-forge-base-'))
  const tempPath = resolve(tempDir, repoRelativePath.replace(/\//g, '__'))
  await writeFile(tempPath, stdout, 'utf8')

  return {
    path: tempPath,
    label: `${options.base}:${repoRelativePath}`,
    base: options.base,
    cleanup: () => rm(tempDir, { recursive: true, force: true }),
  }
}
