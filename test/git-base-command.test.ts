import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { describe, expect, test } from 'vitest'

import { createCli } from '../packages/cli/src/index.js'

const execFileAsync = promisify(execFile)

const oldSchema = `openapi: 3.0.3
info: { title: Git Base API, version: 1.0.0 }
paths:
  /users:
    get:
      operationId: listUsers
      responses:
        "200":
          description: Users
          content:
            application/json:
              schema:
                type: array
                items: { type: object, properties: { id: { type: string } } }
`

const newSchema = `openapi: 3.0.3
info: { title: Git Base API, version: 1.0.0 }
paths: {}
`

describe('git base schema support', () => {
  test('impact compares the current schema against a git base ref', async () => {
    const cwd = await createGitSchemaRepo()
    const reportPath = join(cwd, 'impact.json')

    const result = await runCliInDirectory(cwd, [
      'impact',
      'openapi.yaml',
      '--base',
      'HEAD',
      '--repo',
      cwd,
      '--json',
      '--report-file',
      reportPath,
    ])

    expect(result.exitCode).toBe(1)
    const report = JSON.parse(await readFile(reportPath, 'utf8')) as {
      base?: string
      oldSchema: string
      newSchema: string
      summary: { breaking: number }
    }
    expect(report.base).toBe('HEAD')
    expect(report.oldSchema).toBe('HEAD:openapi.yaml')
    expect(report.newSchema).toBe('openapi.yaml')
    expect(report.summary.breaking).toBeGreaterThan(0)
  })

  test('pilot compares the current schema against a git base ref', async () => {
    const cwd = await createGitSchemaRepo()
    const out = join(cwd, 'forge-pilot')

    const result = await runCliInDirectory(cwd, [
      'pilot',
      'openapi.yaml',
      '--base',
      'HEAD',
      '--repo',
      cwd,
      '--out',
      out,
      '--skip-typecheck',
    ])

    expect(result.exitCode).toBe(1)
    await expect(stat(join(out, 'impact.md'))).resolves.toBeTruthy()
    await expect(stat(join(out, 'go-no-go.md'))).resolves.toBeTruthy()
    const decision = await readFile(join(out, 'go-no-go.md'), 'utf8')
    expect(decision).toContain('- Base ref: HEAD')
    expect(decision).toContain('- Old schema: HEAD:openapi.yaml')
  })

  test('impact reports a clear error when the schema is missing from the base ref', async () => {
    const cwd = await createGitSchemaRepo()

    const result = await runCliInDirectory(cwd, ['impact', 'missing.yaml', '--base', 'HEAD', '--repo', cwd])

    expect(result.exitCode).toBe(2)
    expect(result.error).toContain('Cannot read missing.yaml from git ref "HEAD"')
  })

  test('impact rejects mixing explicit old schema and git base modes', async () => {
    const cwd = await createGitSchemaRepo()

    const result = await runCliInDirectory(cwd, ['impact', 'openapi.old.yaml', 'openapi.yaml', '--base', 'HEAD', '--repo', cwd])

    expect(result.exitCode).toBe(2)
    expect(result.error).toContain('Use either impact <oldSchema> <newSchema> or impact <schema> --base <ref>, not both.')
  })
})

async function createGitSchemaRepo(): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), 'archora-forge-git-base-'))
  await mkdir(join(cwd, 'src'), { recursive: true })
  await writeFile(join(cwd, 'openapi.yaml'), oldSchema, 'utf8')
  await writeFile(join(cwd, 'src', 'users.ts'), 'export const endpoint = "listUsers"\n', 'utf8')
  await execFileAsync('git', ['init'], { cwd })
  await execFileAsync('git', ['add', 'openapi.yaml', 'src/users.ts'], { cwd })
  await execFileAsync(
    'git',
    ['-c', 'user.name=Forge Test', '-c', 'user.email=forge@example.test', 'commit', '-m', 'base schema'],
    { cwd },
  )
  await writeFile(join(cwd, 'openapi.yaml'), newSchema, 'utf8')
  return cwd
}

async function runCliInDirectory(cwd: string, args: string[]): Promise<{ exitCode: string | number | undefined; output: string; error: string }> {
  const previousExitCode = process.exitCode
  const previousCwd = process.cwd()
  const lines: string[] = []
  const errors: string[] = []
  const originalLog = console.log
  const originalError = console.error
  process.exitCode = undefined
  console.log = (...values: unknown[]) => {
    lines.push(values.map(String).join(' '))
  }
  console.error = (...values: unknown[]) => {
    errors.push(values.map(String).join(' '))
  }
  try {
    process.chdir(cwd)
    const cli = await createCli()
    cli.parse(['node', 'archora-forge', ...args], { run: false })
    try {
      await cli.runMatchedCommand()
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
      process.exitCode = 2
    }
    return { exitCode: process.exitCode, output: lines.join('\n'), error: errors.join('\n') }
  } finally {
    process.chdir(previousCwd)
    console.log = originalLog
    console.error = originalError
    process.exitCode = previousExitCode
  }
}
