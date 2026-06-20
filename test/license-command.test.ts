import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, test } from 'vitest'

import { createCli } from '../packages/cli/src/index.js'
import type { LicensePayload } from '../packages/cli/src/license.js'

describe('CLI license activation', () => {
  test('activates a signed license and reports active status', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'archora-forge-license-'))
    const { publicKey, privateKey } = await makeKeyPair()
    const key = await issueTestLicense(privateKey, {
      licenseId: 'lic_test',
      customer: 'Pilot Customer',
      issuedAt: '2026-05-25T00:00:00.000Z',
      expiresAt: '2026-06-25T00:00:00.000Z',
      plan: 'pilot',
    })

    const activate = await runCliInDirectory(cwd, ['license', 'activate', key], {
      ARCHORA_FORGE_LICENSE_PUBLIC_KEY_JWK: JSON.stringify(publicKey),
      ARCHORA_FORGE_LICENSE_FILE: join(cwd, 'license.json'),
    })
    expect(activate.exitCode).toBeUndefined()
    expect(activate.output).toContain('License active for Pilot Customer')

    const status = await runCliInDirectory(cwd, ['license', 'status'], {
      ARCHORA_FORGE_LICENSE_PUBLIC_KEY_JWK: JSON.stringify(publicKey),
      ARCHORA_FORGE_LICENSE_FILE: join(cwd, 'license.json'),
    })
    expect(status.exitCode).toBe(0)
    expect(status.output).toContain('License status: active')
    expect(status.output).toContain('Pilot Customer')
  })

  test('requires activation for Pro commands when license enforcement is configured', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'archora-forge-license-gate-'))
    const { publicKey } = await makeKeyPair()

    const result = await runCliInDirectory(
      cwd,
      ['check', join(process.cwd(), 'test/fixtures/openapi/basic-crud.yaml')],
      {
        ARCHORA_FORGE_LICENSE_PUBLIC_KEY_JWK: JSON.stringify(publicKey),
        ARCHORA_FORGE_LICENSE_FILE: join(cwd, 'missing-license.json'),
      },
    )

    expect(result.exitCode).toBe(2)
    expect(result.error).toContain('License key required')
    expect(result.error).toContain('archora-forge license activate')
  })

  test('runs the free generator without a license even under enforcement', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'archora-forge-free-generate-'))
    const { publicKey } = await makeKeyPair()

    const result = await runCliInDirectory(
      cwd,
      [
        'generate',
        join(process.cwd(), 'test/fixtures/openapi/basic-crud.yaml'),
        '--dry-run',
        '--json',
      ],
      {
        ARCHORA_FORGE_LICENSE_PUBLIC_KEY_JWK: JSON.stringify(publicKey),
        ARCHORA_FORGE_LICENSE_FILE: join(cwd, 'missing-license.json'),
      },
    )

    expect(result.error).not.toContain('License key required')
    expect(result.exitCode).not.toBe(2)
    expect(result.output).toContain('"ok": true')
  })

  test('creates a safe license request markdown file', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'archora-forge-license-request-'))
    const out = join(cwd, 'license-request.md')

    const result = await runCliInDirectory(
      cwd,
      ['license', 'request', '--plan', 'pilot', '--out', out],
      {},
    )

    expect(result.exitCode).toBeUndefined()
    expect(result.output).toContain('License request written')

    const markdown = await readFile(out, 'utf8')
    expect(markdown).toContain('# Archora Forge License Request')
    expect(markdown).toContain('Plan: pilot')
    expect(markdown).toContain('akotov@archora.dev')
    expect(markdown).toContain('@akotofff')
    expect(markdown).toContain('Workspace: archora-forge-license-request-')
    expect(markdown).not.toContain(cwd)
    expect(markdown).not.toContain('ARCHORA_FORGE_LICENSE_PUBLIC_KEY_JWK')
  })
})

async function makeKeyPair(): Promise<{ publicKey: JsonWebKey; privateKey: CryptoKey }> {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ])

  return {
    publicKey: await crypto.subtle.exportKey('jwk', pair.publicKey),
    privateKey: pair.privateKey,
  }
}

async function issueTestLicense(privateKey: CryptoKey, payload: LicensePayload): Promise<string> {
  const payloadSegment = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(payloadSegment),
  )
  return `ARCHORA-FORGE-${payloadSegment}.${bytesToBase64Url(new Uint8Array(signature))}`
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function runCliInDirectory(
  cwd: string,
  args: string[],
  env: Record<string, string>,
): Promise<{ exitCode: string | number | undefined; output: string; error: string }> {
  const previousExitCode = process.exitCode
  const previousCwd = process.cwd()
  const previousEnv: Record<string, string | undefined> = {}
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
    for (const [key, value] of Object.entries(env)) {
      previousEnv[key] = process.env[key]
      process.env[key] = value
    }
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
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}
