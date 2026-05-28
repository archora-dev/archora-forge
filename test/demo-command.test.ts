import { mkdtemp, readFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, test } from 'vitest'

import { createCli } from '../packages/cli/src/index.js'

describe('demo command', () => {
  test('creates a self-contained impact demo package', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'archora-forge-demo-'))
    const out = join(cwd, 'forge-demo')

    const result = await runCliInDirectory(cwd, ['demo', '--out', out])

    expect(result.exitCode).toBe(0)
    expect(result.output).toContain('Demo package:')
    await expect(stat(join(out, 'openapi.old.yaml'))).resolves.toBeTruthy()
    await expect(stat(join(out, 'openapi.yaml'))).resolves.toBeTruthy()
    await expect(stat(join(out, 'src/users.ts'))).resolves.toBeTruthy()
    await expect(stat(join(out, 'report/impact.md'))).resolves.toBeTruthy()
    await expect(stat(join(out, 'report/impact-pr.md'))).resolves.toBeTruthy()
    await expect(stat(join(out, 'report/go-no-go.md'))).resolves.toBeTruthy()
    await expect(stat(join(out, 'report/check.html'))).resolves.toBeTruthy()
    await expect(stat(join(out, 'report/audit/index.html'))).resolves.toBeTruthy()
    await expect(stat(join(out, 'report/README.md'))).resolves.toBeTruthy()

    const impact = await readFile(join(out, 'report/impact.md'), 'utf8')
    expect(impact).toContain('# Frontend API Impact')
    expect(impact).toContain('listUsers')

    const handoff = await readFile(join(out, 'report/README.md'), 'utf8')
    expect(handoff).toContain('Open `impact-pr.md` first')
    expect(handoff).toContain('Open `check.html`')
    expect(handoff).toContain('Open `audit/index.html`')
    expect(handoff).toContain('archora-forge ci init github --schema ./openapi.yaml')
    expect(handoff).toContain('--gate comment')

    const check = await readFile(join(out, 'report/check.html'), 'utf8')
    expect(check).toContain('Archora Forge Check')
    expect(check).toContain('Pilot Readiness')
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
