import { join } from 'node:path'

import { describe, expect, test } from 'vitest'

import { resolveForgeConfig } from '../packages/config/src/index.js'
import {
  createGenerationPlan,
  createSchemaCoverageMatrix,
  collectDiagnostics,
  detectResources,
  normalizeOpenApi,
  parseOpenApi,
} from '../packages/core/src/index.js'

const stressDir = join(process.cwd(), 'test/fixtures/openapi/stress')

async function planFor(fixture: string) {
  const input = join(stressDir, fixture)
  const normalized = normalizeOpenApi(await parseOpenApi(input))
  const diagnostics = collectDiagnostics(normalized)
  const resources = detectResources(normalized.operations)
  const plan = await createGenerationPlan({
    config: resolveForgeConfig({ input }),
    normalized,
    resources,
    cwd: process.cwd(),
  })
  const coverage = createSchemaCoverageMatrix(normalized, diagnostics)
  const componentTypes =
    plan.files.find((file) => file.path.endsWith('components.types.ts'))?.content ?? ''
  return { plan, coverage, componentTypes }
}

describe('stress fixtures generate fully covered, correct contracts', () => {
  test('demo-fleet: discriminated unions, deep allOf inheritance, recursion', async () => {
    const { coverage, componentTypes } = await planFor('demo-fleet.yaml')

    // Inheritance-style allOf and discriminated unions are real generated types now, so
    // nothing in this schema is reported as an unsupported construct.
    expect(coverage.schemas.unsupportedConstructs).toEqual({})

    // Explicit-mapping union narrows on the mapped discriminant.
    expect(componentTypes).toMatch(/\(Car & \{ kind: ['"]car['"] \}\)/)
    // Implicit-mapping union derives the discriminant from the `kind` enum, not the
    // schema name, so `AssetInput` narrows on `car`, not `Car`.
    expect(componentTypes).toMatch(/AssetInput =[\s\S]*\(Car & \{ kind: ['"]car['"] \}\)/)
    expect(componentTypes).not.toMatch(/kind: ['"]Car['"]/)
    // The enum is a string-literal union, and the deep allOf chain is flattened.
    expect(componentTypes).toMatch(/export type AssetKind = ['"]car['"]/)
    expect(componentTypes).toMatch(/export interface Car \{[\s\S]*seats: number/)
    // Recursive component renders as a self-referential type.
    expect(componentTypes).toMatch(/children\?: OrgUnit\[\]/)
  })

  test('demo-fleet: required header parameters are typed onto the CRUD client options', async () => {
    const { plan } = await planFor('demo-fleet.yaml')
    const client = plan.files.find((file) => file.path.endsWith('assets.client.ts'))?.content ?? ''
    // x-tenant-id is a required header on the assets CRUD endpoints, so it is typed onto
    // options.headers rather than dropped to a diagnostic.
    expect(client).toMatch(/headers: \{ 'x-tenant-id': string \} & Record<string, string>/)
  })

  test('demo-edge-types: numeric/nullable enums, unions and nested arrays', async () => {
    const { coverage, componentTypes } = await planFor('demo-edge-types.yaml')

    expect(coverage.schemas.unsupportedConstructs).toEqual({})
    expect(componentTypes).toMatch(/export type Priority = 1 \| 2 \| 3/)
    expect(componentTypes).toMatch(/export type Mode = ['"]auto['"] \| ['"]manual['"] \| null/)
    expect(componentTypes).toMatch(/variants: \(Tag \| string\)\[\]/)
    expect(componentTypes).toMatch(/scores\?: number\[\]\[\]/)
  })
})
