import { describe, expect, test } from 'vitest'

import {
  createIdentifierRegistry,
  toSafeFileName,
  toSafeIdentifier,
  toSafeTypeName,
} from '../packages/core/src/generation/identifiers.js'
import { detectResources, normalizeOpenApi } from '../packages/core/src/index.js'

describe('central identifier sanitization', () => {
  test.each([
    ['create-file', 'createFile', 'CreateFile'],
    ['user.profile', 'userProfile', 'UserProfile'],
    ['user profile', 'userProfile', 'UserProfile'],
    ['123create user', '_123createUser', '_123createUser'],
    ['призывник профиль', 'prizyvnikProfil', 'PrizyvnikProfil'],
    ['class', 'classValue', 'ClassValue'],
    ['default', 'defaultValue', 'DefaultValue'],
    ['function', 'functionValue', 'FunctionValue'],
    ['import', 'importValue', 'ImportValue'],
  ])('sanitizes %s consistently', (raw, identifier, typeName) => {
    expect(toSafeIdentifier(raw, 'value')).toBe(identifier)
    expect(toSafeTypeName(raw, 'GeneratedType')).toBe(typeName)
    expect(toSafeFileName(raw, 'file')).not.toMatch(/[\s.]/)
  })

  test('adds deterministic suffixes for duplicate sanitized identifiers', () => {
    const registry = createIdentifierRegistry()

    expect(registry.identifier('create-file')).toBe('createFile')
    expect(registry.identifier('create file')).toBe('createFile2')
    expect(registry.identifier('create.file')).toBe('createFile3')
  })

  test('detectResources returns sanitized collision-safe resource names and entities', () => {
    const normalized = normalizeOpenApi({
      openapi: '3.0.3',
      info: { title: 'Unsafe names', version: '1.0.0' },
      paths: {
        '/api/v1/create-file': { get: { operationId: 'listCreateFiles', responses: { '200': { description: 'OK' } } } },
        '/api/v1/create file': { get: { operationId: 'listCreateFiles2', responses: { '200': { description: 'OK' } } } },
      },
    })

    expect(detectResources(normalized.operations).map((resource) => [resource.name, resource.entity])).toEqual([
      ['createFile', 'CreateFile'],
      ['createFile2', 'CreateFile2'],
    ])
  })
})
