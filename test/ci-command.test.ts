import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, test } from 'vitest'

import { createCli } from '../packages/cli/src/index.js'

describe('ci command', () => {
  test('writes a GitHub impact workflow', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'archora-forge-ci-'))

    const result = await runCliInDirectory(cwd, [
      'ci',
      'init',
      'github',
      '--schema',
      'contracts/openapi.yaml',
      '--base',
      'origin/main',
    ])

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

    const result = await runCliInDirectory(cwd, [
      'ci',
      'init',
      'github',
      '--schema',
      'openapi.yaml',
      '--gate',
      'comment',
    ])

    expect(result.exitCode).toBeUndefined()
    const workflow = await readFile(join(cwd, '.github/workflows/archora-forge-impact.yml'), 'utf8')
    expect(workflow).toContain('FORGE_GATE_MODE: comment')
    expect(workflow).toContain('Run Forge impact')
    expect(workflow).not.toContain('Block merge on blocked API impact')
    expect(workflow).toContain('actions-comment-pull-request')
  })

  test('can write a GitHub pilot workflow', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'archora-forge-ci-pilot-'))

    const result = await runCliInDirectory(cwd, [
      'ci',
      'init',
      'github',
      '--mode',
      'pilot',
      '--schema',
      'openapi.yaml',
    ])

    expect(result.exitCode).toBeUndefined()
    const workflow = await readFile(join(cwd, '.github/workflows/archora-forge-impact.yml'), 'utf8')
    expect(workflow).toContain('archora-forge pilot "$OPENAPI_SCHEMA" --base "$OPENAPI_BASE_REF"')
    expect(workflow).toContain('forge-pilot')
  })

  test('writes a turnkey GitHub kit with a FORGE_CI.md handoff', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'archora-forge-ci-handoff-'))

    const result = await runCliInDirectory(cwd, [
      'ci',
      'init',
      'github',
      '--schema',
      'openapi.yaml',
      '--gate',
      'comment',
    ])

    expect(result.output).toContain('Created FORGE_CI.md')
    const handoff = await readFile(join(cwd, 'FORGE_CI.md'), 'utf8')
    expect(handoff).toContain('# Forge CI Kit')
    expect(handoff).toContain('Provider: github')
    expect(handoff).toContain('Gate: comment')
  })

  test('--no-readme skips the handoff document', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'archora-forge-ci-noreadme-'))

    const result = await runCliInDirectory(cwd, [
      'ci',
      'init',
      'github',
      '--schema',
      'openapi.yaml',
      '--no-readme',
    ])

    expect(result.output).not.toContain('FORGE_CI.md')
    await expect(readFile(join(cwd, 'FORGE_CI.md'), 'utf8')).rejects.toThrow()
  })

  test('re-running is idempotent and reports an up-to-date kit', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'archora-forge-ci-idempotent-'))
    const args = ['ci', 'init', 'github', '--schema', 'openapi.yaml']

    await runCliInDirectory(cwd, args)
    const second = await runCliInDirectory(cwd, args)

    expect(second.output).toContain('is already up to date')
    expect(second.output).not.toContain('Created')
  })

  test('refuses to overwrite a changed workflow without --force', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'archora-forge-ci-force-'))

    await runCliInDirectory(cwd, ['ci', 'init', 'github', '--schema', 'openapi.yaml'])
    const changed = await runCliInDirectory(cwd, ['ci', 'init', 'github', '--schema', 'other.yaml'])
    expect(changed.output).toContain('already exists with different content')

    const forced = await runCliInDirectory(cwd, [
      'ci',
      'init',
      'github',
      '--schema',
      'other.yaml',
      '--force',
    ])
    expect(forced.output).toContain('Updated .github/workflows/archora-forge-impact.yml')
    const workflow = await readFile(join(cwd, '.github/workflows/archora-forge-impact.yml'), 'utf8')
    expect(workflow).toContain('OPENAPI_SCHEMA: other.yaml')
  })

  test('writes an includable GitLab pipeline with a merge-request rule', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'archora-forge-ci-gitlab-'))

    const result = await runCliInDirectory(cwd, [
      'ci',
      'init',
      'gitlab',
      '--schema',
      'api/openapi.yaml',
      '--gate',
      'comment',
    ])

    expect(result.exitCode).toBeUndefined()
    expect(result.output).toContain('Created .gitlab/archora-forge-impact.yml')
    expect(result.output).toContain("include: { local: '.gitlab/archora-forge-impact.yml' }")
    const pipeline = await readFile(join(cwd, '.gitlab/archora-forge-impact.yml'), 'utf8')
    expect(pipeline).toContain('archora-forge-impact:')
    expect(pipeline).toContain('OPENAPI_SCHEMA: api/openapi.yaml')
    expect(pipeline).toContain('$CI_PIPELINE_SOURCE == "merge_request_event"')
    // comment gate keeps the job green by swallowing the impact exit code
    expect(pipeline).toContain('forge-impact-pr.md || true')
  })

  test('GitLab block gate fails the job on blocked impact', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'archora-forge-ci-gitlab-block-'))

    await runCliInDirectory(cwd, [
      'ci',
      'init',
      'gitlab',
      '--schema',
      'openapi.yaml',
      '--gate',
      'block',
    ])
    const pipeline = await readFile(join(cwd, '.gitlab/archora-forge-impact.yml'), 'utf8')
    expect(pipeline).toContain('FORGE_GATE_MODE: block')
    // block gate lets the non-zero impact exit fail the job
    expect(pipeline).not.toContain('forge-impact-pr.md || true')
  })

  test('rejects an unsupported provider', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'archora-forge-ci-provider-'))

    await expect(runCliInDirectory(cwd, ['ci', 'init', 'bitbucket'])).rejects.toThrow(
      'Unsupported CI provider "bitbucket"',
    )
  })
})

async function runCliInDirectory(
  cwd: string,
  args: string[],
): Promise<{ exitCode: string | number | undefined; output: string; error: string }> {
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
    await cli.runMatchedCommand()

    return { exitCode: process.exitCode, output: lines.join('\n'), error: errors.join('\n') }
  } finally {
    process.chdir(previousCwd)
    console.log = originalLog
    console.error = originalError
    process.exitCode = previousExitCode
  }
}
