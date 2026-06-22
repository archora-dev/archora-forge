import { readFile } from 'node:fs/promises'

import { describe, expect, test } from 'vitest'

import { metadataFieldAdapter } from '../packages/adapters/src/index.js'
import { createCli } from '../packages/cli/src/index.js'
import { defineForgeConfig } from '../packages/config/src/index.js'
import { ForgeError, forgeCoreVersion } from '../packages/core/src/index.js'
import { createPermissionsTemplate } from '../packages/templates/src/index.js'

describe('foundation exports', () => {
  test('exposes typed config helper', () => {
    const config = defineForgeConfig({
      input: './openapi.yaml',
      target: {
        framework: 'neutral',
      },
    })

    expect(config.input).toBe('./openapi.yaml')
    expect(config.target?.framework).toBe('neutral')

    const multiSchemaConfig = defineForgeConfig({
      inputs: [{ name: 'users', path: './contracts/users.yaml' }],
    })
    expect(multiSchemaConfig.inputs[0]?.name).toBe('users')
  })

  test('exposes core primitives', () => {
    const error = new ForgeError('Failed to inspect schema', {
      suggestion: 'Provide an OpenAPI 3.x document.',
    })

    expect(forgeCoreVersion).toBe('2.0.0')
    expect(error.details.suggestion).toContain('OpenAPI')
  })

  test('exposes adapter mappings', () => {
    expect(metadataFieldAdapter.enum).toBe('select')
  })

  test('exposes template helpers', () => {
    const output = createPermissionsTemplate({
      resourceName: 'users',
      permissions: {
        view: 'users.read',
        create: 'users.create',
        update: 'users.update',
        delete: 'users.delete',
      },
    })

    expect(output).toContain('usersPermissions')
    expect(output).toContain('users.read')
  })
})

describe('cli foundation', () => {
  test('registers required commands', async () => {
    const cli = await createCli()
    const commandNames = cli.commands.map((command) => command.name)

    expect(commandNames).toEqual(
      expect.arrayContaining([
        'init',
        'license',
        'pilot',
        'ci',
        'demo',
        'adoption',
        'explain',
        'audit',
        'doctor',
        'generate',
        'inspect',
        'validate',
        'diff',
        'lint',
        'contract-diff',
        'impact',
      ]),
    )
  })
})

describe('repository automation', () => {
  test('package manifests carry the open-core license terms', async () => {
    // Free, open-source tier — MIT (see LICENSE at the repository root).
    const mitPackageJsonPaths = [
      'package.json',
      'apps/docs/package.json',
      'packages/adapters/package.json',
      'packages/cli/package.json',
      'packages/config/package.json',
      'packages/core/package.json',
      'packages/runtime/package.json',
      'packages/templates/package.json',
      'examples/mini-ecommerce/package.json',
      'examples/petstore/package.json',
      'examples/public-crm/package.json',
      'examples/ui-kit-integration/package.json',
    ]

    for (const packageJsonPath of mitPackageJsonPaths) {
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
        license?: string
      }

      expect(packageJson.license, packageJsonPath).toBe('MIT')
    }

    // Commercial tier — Forge Intelligence stays proprietary (see packages/pro/LICENSE).
    const proManifest = JSON.parse(await readFile('packages/pro/package.json', 'utf8')) as {
      license?: string
    }
    expect(proManifest.license, 'packages/pro/package.json').toBe('SEE LICENSE IN LICENSE')
  })

  test('ships a primary CI workflow for release checks', async () => {
    const workflow = await readFile('.github/workflows/ci.yml', 'utf8')

    expect(workflow).toContain('pnpm release:check')
    expect(workflow).toContain('pull_request:')
    expect(workflow).toContain('node-version: 22')
  })

  test('CLI version is read from package metadata instead of a hardcoded literal', async () => {
    const source = await readFile('packages/cli/src/index.ts', 'utf8')

    expect(source).not.toContain("cli.version('0.0.0')")
    expect(source).toContain('cli.version(cliVersion)')
  })

  test('external consumer smoke covers the readiness command', async () => {
    const script = await readFile('scripts/smoke-external-consumer.sh', 'utf8')

    expect(script).toContain('pnpm exec archora-forge doctor')
  })
})
