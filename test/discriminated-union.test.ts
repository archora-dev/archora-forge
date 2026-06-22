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

  test('implicit mapping derives the discriminant from an enum-constrained property', () => {
    const normalized = normalizeOpenApi({
      ...baseDocument,
      components: {
        schemas: {
          AssetKind: { type: 'string', enum: ['car', 'truck'] },
          Car: {
            type: 'object',
            required: ['kind'],
            properties: {
              kind: { $ref: '#/components/schemas/AssetKind' },
              seats: { type: 'integer' },
            },
          },
          Truck: {
            type: 'object',
            required: ['kind'],
            properties: {
              kind: { $ref: '#/components/schemas/AssetKind' },
              axles: { type: 'integer' },
            },
          },
          Pet: {
            oneOf: [{ $ref: '#/components/schemas/Car' }, { $ref: '#/components/schemas/Truck' }],
            discriminator: { propertyName: 'kind' },
          },
        },
      },
    })

    const types = createSharedSchemaTypes(normalized)
    // Without explicit mapping the discriminant is taken from the enum the property is
    // constrained to (lowercase `car`), not the capitalized schema name `Car`, so the
    // narrowed literal actually inhabits the property type and the union typechecks.
    expect(types).toMatch(
      /\(Car & \{ kind: ['"]car['"] \}\) \| \(Truck & \{ kind: ['"]truck['"] \}\)/,
    )
    expect(types).not.toMatch(/kind: ['"]Car['"]/)
  })

  test('top-level enum schema is emitted as a string-literal union, not an empty interface', () => {
    const normalized = normalizeOpenApi({
      ...baseDocument,
      components: {
        schemas: {
          AssetKind: { type: 'string', enum: ['car', 'truck', 'drone'] },
          Pet: {
            type: 'object',
            properties: { kind: { $ref: '#/components/schemas/AssetKind' } },
          },
        },
      },
    })

    const types = createSharedSchemaTypes(normalized)
    expect(types).toMatch(/export type AssetKind = ['"]car['"] \| ['"]truck['"] \| ['"]drone['"]/)
    // A bare `interface AssetKind {}` would silently widen the type to accept anything.
    expect(types).not.toMatch(/interface AssetKind\b/)
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
