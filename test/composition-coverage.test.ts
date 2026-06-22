import { describe, expect, test } from 'vitest'

import {
  collectDiagnostics,
  createSharedSchemaTypes,
  normalizeOpenApi,
} from '../packages/core/src/index.js'

function documentWith(schemas: Record<string, unknown>) {
  return {
    openapi: '3.0.3',
    info: { title: 'Composition', version: '1.0.0' },
    paths: {
      '/things': {
        get: {
          operationId: 'listThings',
          responses: {
            '200': {
              description: 'Things',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Thing' } } },
            },
          },
        },
      },
    },
    components: { schemas: schemas as Record<string, never> },
  }
}

describe('composition coverage', () => {
  // S2 — allOf merge of non-conflicting object branches
  test('allOf merges base and extension properties into one interface', () => {
    const normalized = normalizeOpenApi(
      documentWith({
        BaseEvent: {
          type: 'object',
          required: ['id', 'kind'],
          properties: { id: { type: 'string' }, kind: { type: 'string' } },
        },
        Thing: {
          allOf: [
            { $ref: '#/components/schemas/BaseEvent' },
            { type: 'object', required: ['amount'], properties: { amount: { type: 'number' } } },
          ],
        },
      }),
    )

    const types = createSharedSchemaTypes(normalized)
    expect(types).toContain('export interface Thing')
    expect(types).toMatch(/id: string/)
    expect(types).toMatch(/kind: string/)
    expect(types).toMatch(/amount: number/)
    // A clean merge is not surfaced as an unsupported construct.
    expect(collectDiagnostics(normalized).map((d) => d.code)).not.toContain('unsupported-allof')
  })

  // S3 — object oneOf without a discriminator is a real union, not a fallback
  test('object oneOf without discriminator generates a union and is supported', () => {
    const normalized = normalizeOpenApi(
      documentWith({
        Card: { type: 'object', required: ['pan'], properties: { pan: { type: 'string' } } },
        Cash: { type: 'object', required: ['note'], properties: { note: { type: 'string' } } },
        Thing: {
          oneOf: [{ $ref: '#/components/schemas/Card' }, { $ref: '#/components/schemas/Cash' }],
        },
      }),
    )

    const types = createSharedSchemaTypes(normalized)
    expect(types).toContain('export type Thing = Card | Cash')
    const codes = collectDiagnostics(normalized).map((d) => d.code)
    expect(codes).not.toContain('unsupported-oneof')
  })

  // S4 — nullable is reflected consistently in the generated type
  test('nullable properties render a "| null" union member', () => {
    const normalized = normalizeOpenApi(
      documentWith({
        Thing: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
            note: { type: 'string', nullable: true },
            legacy: { type: ['string', 'null'] },
          },
        },
      }),
    )

    const types = createSharedSchemaTypes(normalized)
    expect(types).toMatch(/note\?: string \| null/)
    expect(types).toMatch(/legacy\?: string \| null/)
  })

  // A nullable top-level enum/scalar component must keep `| null` on its type alias,
  // not just on property uses, otherwise callers cannot assign the null the API allows.
  test('nullable top-level enum alias keeps the null member', () => {
    const normalized = normalizeOpenApi(
      documentWith({
        Mode: { type: 'string', enum: ['auto', 'manual'], nullable: true },
      }),
    )

    const types = createSharedSchemaTypes(normalized)
    expect(types).toMatch(/export type Mode = ['"]auto['"] \| ['"]manual['"] \| null/)
  })
})
