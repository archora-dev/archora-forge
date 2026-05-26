import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, test } from 'vitest'

import { createCli } from '../packages/cli/src/index.js'

describe('explain command', () => {
  test('explains a known diagnostic code', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'archora-forge-explain-'))

    const result = await runCliInDirectory(cwd, ['explain', 'unsupported-oneof'])

    expect(result.exitCode).toBeUndefined()
    expect(result.output).toContain('unsupported-oneof')
    expect(result.output).toContain('Why it matters')
    expect(result.output).toContain('Pilot impact')
  })

  test('lists known diagnostic codes as JSON', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'archora-forge-explain-list-'))

    const result = await runCliInDirectory(cwd, ['explain', '--list', '--json'])

    expect(result.exitCode).toBeUndefined()
    const payload = JSON.parse(result.output) as { diagnostics: Array<{ code: string }> }
    expect(payload.diagnostics.map((entry) => entry.code)).toContain('unsupported-oneof')
    expect(payload.diagnostics.map((entry) => entry.code)).toContain('missing-response-schema')
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
