import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, test } from 'vitest'

import { createCli } from '../packages/cli/src/index.js'

describe('ci command', () => {
  test('writes a GitHub impact workflow', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'archora-forge-ci-'))

    const result = await runCliInDirectory(cwd, ['ci', 'init', 'github', '--schema', 'contracts/openapi.yaml', '--base', 'origin/main'])

    expect(result.exitCode).toBeUndefined()
    expect(result.output).toContain('Created .github/workflows/archora-forge-impact.yml')
    const workflow = await readFile(join(cwd, '.github/workflows/archora-forge-impact.yml'), 'utf8')
    expect(workflow).toContain('OPENAPI_SCHEMA: contracts/openapi.yaml')
    expect(workflow).toContain('OPENAPI_BASE_REF: origin/main')
    expect(workflow).toContain('archora-forge impact "$OPENAPI_SCHEMA" --base "$OPENAPI_BASE_REF"')
    expect(workflow).toContain('forge-impact-pr.md')
    expect(workflow).toContain('FORGE_GATE_MODE: block')
    expect(workflow).toContain('Block merge on blocked API impact')
  })

  test('can write a comment-only GitHub impact workflow', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'archora-forge-ci-comment-'))

    const result = await runCliInDirectory(cwd, ['ci', 'init', 'github', '--schema', 'openapi.yaml', '--gate', 'comment'])

    expect(result.exitCode).toBeUndefined()
    const workflow = await readFile(join(cwd, '.github/workflows/archora-forge-impact.yml'), 'utf8')
    expect(workflow).toContain('FORGE_GATE_MODE: comment')
    expect(workflow).toContain('Run Forge impact')
    expect(workflow).not.toContain('Block merge on blocked API impact')
    expect(workflow).toContain('actions-comment-pull-request')
  })

  test('can write a GitHub pilot workflow', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'archora-forge-ci-pilot-'))

    const result = await runCliInDirectory(cwd, ['ci', 'init', 'github', '--mode', 'pilot', '--schema', 'openapi.yaml'])

    expect(result.exitCode).toBeUndefined()
    const workflow = await readFile(join(cwd, '.github/workflows/archora-forge-impact.yml'), 'utf8')
    expect(workflow).toContain('archora-forge pilot "$OPENAPI_SCHEMA" --base "$OPENAPI_BASE_REF"')
    expect(workflow).toContain('forge-pilot')
  })
})

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
    const cli = createCli()
    cli.parse(['node', 'archora-forge', ...args], { run: false })
    await cli.runMatchedCommand()

    return { exitCode: process.exitCode, output: lines.join('\n'), error: errors.join('\n') }
  } finally {
    process.chdir(previousCwd)
    console.log = originalLog
    console.error = originalError
    process.exitCode = previousExitCode
  }
}
