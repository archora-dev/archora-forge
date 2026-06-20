import { describe, expect, test } from 'vitest'

import {
  collectDiagnostics,
  createSharedSchemaTypes,
  normalizeOpenApi,
} from '../packages/core/src/index.js'

const baseDocument = {
  openapi: '3.0.3',
  info: { title: 'Pets', version: '1.0.0' },
  paths: {
    '/pets': {
      get: {
        operationId: 'listPets',
        responses: {
          '200': {
            description: 'Pets',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } },
          },
        },
      },
    },
  },
}

const catDog = {
  Cat: {
    type: 'object',
    required: ['petType', 'meowVolume'],
    properties: { petType: { type: 'string' }, meowVolume: { type: 'number' } },
  },
  Dog: {
    type: 'object',
    required: ['petType', 'barkVolume'],
    properties: { petType: { type: 'string' }, barkVolume: { type: 'number' } },
  },
}

describe('discriminated unions', () => {
  test('object-branch discriminator narrows the union via literal discriminant', () => {
    const normalized = normalizeOpenApi({
      ...baseDocument,
      components: {
        schemas: {
          ...catDog,
          Pet: {
            oneOf: [{ $ref: '#/components/schemas/Cat' }, { $ref: '#/components/schemas/Dog' }],
            discriminator: {
              propertyName: 'petType',
              mapping: { cat: '#/components/schemas/Cat', dog: '#/components/schemas/Dog' },
            },
          },
        },
      },
    })

    const types = createSharedSchemaTypes(normalized)
    expect(types).toMatch(
      /export type Pet = \(Cat & \{ petType: ['"]cat['"] \}\) \| \(Dog & \{ petType: ['"]dog['"] \}\)/,
    )

    // A real, generated discriminated union is no longer reported as unsupported.
    const codes = collectDiagnostics(normalized).map((diagnostic) => diagnostic.code)
    expect(codes).not.toContain('unsupported-discriminator')
    expect(codes).not.toContain('unsupported-oneof')
  })

  test('implicit mapping falls back to the schema name as the discriminant', () => {
    const normalized = normalizeOpenApi({
      ...baseDocument,
      components: {
        schemas: {
          ...catDog,
          Pet: {
            oneOf: [{ $ref: '#/components/schemas/Cat' }, { $ref: '#/components/schemas/Dog' }],
            discriminator: { propertyName: 'petType' },
          },
        },
      },
    })

    const types = createSharedSchemaTypes(normalized)
    expect(types).toMatch(
      /\(Cat & \{ petType: ['"]Cat['"] \}\) \| \(Dog & \{ petType: ['"]Dog['"] \}\)/,
    )
  })

  test('discriminator over scalar branches stays diagnostic-only', () => {
    const normalized = normalizeOpenApi({
      ...baseDocument,
      components: {
        schemas: {
          Pet: {
            oneOf: [{ type: 'string' }, { type: 'number' }],
            discriminator: { propertyName: 'type' },
          },
        },
      },
    })

    const types = createSharedSchemaTypes(normalized)
    expect(types).toContain('export type Pet = string | number')

    const codes = collectDiagnostics(normalized).map((diagnostic) => diagnostic.code)
    expect(codes).toContain('unsupported-discriminator')
    expect(codes).toContain('unsupported-oneof')
  })
})
