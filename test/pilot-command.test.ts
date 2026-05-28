import { mkdtemp, readFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, test } from 'vitest'

import { createCli } from '../packages/cli/src/index.js'

const oldSchema = join(process.cwd(), 'apps/docs/public/impact-demo/openapi.old.yaml')
const newSchema = join(process.cwd(), 'apps/docs/public/impact-demo/openapi.new.yaml')

describe('pilot command', () => {
  test('writes impact, audit and go/no-go artifacts', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'archora-forge-pilot-'))
    const out = join(cwd, 'forge-pilot')

    const result = await runCliInDirectory(cwd, [
      'pilot',
      newSchema,
      '--old',
      oldSchema,
      '--repo',
      process.cwd(),
      '--out',
      out,
      '--skip-typecheck',
    ])

    expect(result.exitCode).toBe(1)
    expect(result.output).toContain('Pilot package:')
    await expect(stat(join(out, 'impact.md'))).resolves.toBeTruthy()
    await expect(stat(join(out, 'impact-pr.md'))).resolves.toBeTruthy()
    await expect(stat(join(out, 'go-no-go.md'))).resolves.toBeTruthy()
    await expect(stat(join(out, 'pilot-report.md'))).resolves.toBeTruthy()
    await expect(stat(join(out, 'audit/index.html'))).resolves.toBeTruthy()

    const decision = await readFile(join(out, 'go-no-go.md'), 'utf8')
    expect(decision).toContain('Decision: no-go')
    expect(decision).toContain('Impact decision: blocked')

    const report = await readFile(join(out, 'pilot-report.md'), 'utf8')
    expect(report).toContain('# Archora Forge Pilot Report')
    expect(report).toContain('## Artifact Links')
    expect(report).toContain('impact-pr.md')
    expect(report).toContain('audit/index.html')
    expect(report).toContain('## Decision')
    expect(report).toContain('## Reviewer Checklist')
    expect(report).toContain('Confirm `impact-pr.md` gives a clear merge decision.')
    expect(report).toContain('Confirm `audit/index.html` matches the frontend resource model.')
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
