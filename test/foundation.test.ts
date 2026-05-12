import { describe, expect, test } from 'vitest'

import { archoraUiFieldAdapter, vueTarget } from '../packages/adapters/src/index.js'
import { createCli } from '../packages/cli/src/index.js'
import { defineForgeConfig } from '../packages/config/src/index.js'
import { ForgeError, forgeCoreVersion } from '../packages/core/src/index.js'
import { createPermissionsTemplate } from '../packages/templates/src/index.js'

describe('foundation exports', () => {
  test('exposes typed config helper', () => {
    const config = defineForgeConfig({
      input: './openapi.yaml',
      target: {
        framework: 'vue',
      },
    })

    expect(config.input).toBe('./openapi.yaml')
    expect(config.target?.framework).toBe('vue')
  })

  test('exposes core primitives', () => {
    const error = new ForgeError('Failed to inspect schema', {
      suggestion: 'Provide an OpenAPI 3.x document.',
    })

    expect(forgeCoreVersion).toBe('0.0.0')
    expect(error.details.suggestion).toContain('OpenAPI')
  })

  test('exposes adapter mappings', () => {
    expect(archoraUiFieldAdapter.enum).toBe('ArchSelect')
    expect(vueTarget.query).toBe('tanstack-vue-query')
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
  test('registers required commands', () => {
    const cli = createCli()
    const commandNames = cli.commands.map((command) => command.name)

    expect(commandNames).toEqual(expect.arrayContaining(['init', 'generate', 'inspect', 'validate', 'diff', 'lint', 'contract-diff']))
  })
})
