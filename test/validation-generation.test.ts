import { describe, expect, test } from 'vitest'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import {
  createGenerationPlan,
  detectResources,
  normalizeOpenApi,
} from '../packages/core/src/index.js'
import { resolveForgeConfig, type ForgeConfig } from '../packages/config/src/index.js'

const document = {
  openapi: '3.0.3',
  info: { title: 'Widgets', version: '1.0.0' },
  paths: {
    '/widgets': {
      get: { operationId: 'listWidgets', responses: { '200': { description: 'ok' } } },
      post: {
        operationId: 'createWidget',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'price'],
                properties: {
                  name: { type: 'string', minLength: 1 },
                  email: { type: 'string', format: 'email' },
                  price: { type: 'number', minimum: 0 },
                  status: { type: 'string', enum: ['active', 'inactive'] },
                  tags: { type: 'array', items: { type: 'string' } },
                  note: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'created' } },
      },
    },
    '/widgets/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      get: { operationId: 'getWidget', responses: { '200': { description: 'ok' } } },
    },
  },
}

async function validationFile(mode: 'zod' | 'valibot'): Promise<string> {
  const normalized = normalizeOpenApi(document)
  const config = resolveForgeConfig({ input: './openapi.yaml', validation: mode } as ForgeConfig)
  const plan = await createGenerationPlan({
    config,
    normalized,
    resources: detectResources(normalized.operations),
    cwd: await mkdir(
      join(tmpdir(), `forge-val-${Date.now()}-${Math.random().toString(16).slice(2)}`),
      {
        recursive: true,
      },
    ).then((dir) => dir as string),
  })
  return plan.files.find((file) => file.path.endsWith('widgets.validation.ts'))?.content ?? ''
}

describe('validation generation', () => {
  test('zod schemas cover required/optional, formats, constraints, enum, array and nullable', async () => {
    const file = await validationFile('zod')

    expect(file).toContain("import { z } from 'zod'")
    expect(file).toContain('export const createWidgetSchema')
    expect(file).toContain('z.object({')
    expect(file).toContain('z.string().min(1)') // name: required + minLength
    expect(file).toContain('z.string().email()') // email format
    expect(file).toContain('z.number().min(0)') // price: minimum
    expect(file).toContain("z.enum(['active', 'inactive'])")
    expect(file).toContain('z.array(z.string())')
    expect(file).toContain('z.string().nullable()') // note: nullable
    expect(file).toContain('.optional()') // optional members present
  })

  test('valibot schemas cover the same surface', async () => {
    const file = await validationFile('valibot')

    expect(file).toContain("import * as v from 'valibot'")
    expect(file).toContain('export const createWidgetSchema')
    expect(file).toContain('v.object({')
    expect(file).toContain('v.pipe(v.string(), v.minLength(1))')
    expect(file).toContain('v.email()')
    expect(file).toContain('v.minValue(0)')
    expect(file).toContain("v.picklist(['active', 'inactive'])")
    expect(file).toContain('v.array(v.string())')
    expect(file).toContain('v.nullable(v.string())')
    expect(file).toContain('v.optional(')
  })

  const discriminatedDocument = {
    openapi: '3.0.3',
    info: { title: 'Assets', version: '1.0.0' },
    paths: {
      '/assets': {
        post: {
          operationId: 'createAsset',
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AssetInput' } },
            },
          },
          responses: { '201': { description: 'created' } },
        },
        get: { operationId: 'listAssets', responses: { '200': { description: 'ok' } } },
      },
    },
    components: {
      schemas: {
        AssetKind: { type: 'string', enum: ['car', 'truck'] },
        Car: {
          type: 'object',
          required: ['kind', 'seats'],
          properties: {
            kind: { $ref: '#/components/schemas/AssetKind' },
            seats: { type: 'integer' },
          },
        },
        Truck: {
          type: 'object',
          required: ['kind', 'payloadKg'],
          properties: {
            kind: { $ref: '#/components/schemas/AssetKind' },
            payloadKg: { type: 'integer' },
          },
        },
        AssetInput: {
          oneOf: [{ $ref: '#/components/schemas/Car' }, { $ref: '#/components/schemas/Truck' }],
          discriminator: { propertyName: 'kind' },
        },
      },
    },
  }

  async function assetValidationFile(mode: 'zod' | 'valibot'): Promise<string> {
    const normalized = normalizeOpenApi(discriminatedDocument)
    const config = resolveForgeConfig({ input: './openapi.yaml', validation: mode } as ForgeConfig)
    const plan = await createGenerationPlan({
      config,
      normalized,
      resources: detectResources(normalized.operations),
      cwd: await mkdir(
        join(tmpdir(), `forge-val-${Date.now()}-${Math.random().toString(16).slice(2)}`),
        {
          recursive: true,
        },
      ).then((dir) => dir as string),
    })
    return plan.files.find((file) => file.path.endsWith('assets.validation.ts'))?.content ?? ''
  }

  test('zod emits a discriminated union with a literal discriminant per branch', async () => {
    const file = await assetValidationFile('zod')
    expect(file).toContain("z.discriminatedUnion('kind', [")
    expect(file).toContain("kind: z.literal('car')")
    expect(file).toContain("kind: z.literal('truck')")
    // Not the broad fallback that loses the discriminant.
    expect(file).not.toMatch(/z\.union\(\[/)
  })

  test('valibot emits a variant with a literal discriminant per branch', async () => {
    const file = await assetValidationFile('valibot')
    expect(file).toContain("v.variant('kind', [")
    expect(file).toContain("kind: v.literal('car')")
    expect(file).toContain("kind: v.literal('truck')")
    expect(file).not.toMatch(/v\.union\(\[/)
  })
})
