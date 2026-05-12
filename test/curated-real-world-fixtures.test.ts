import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, test } from 'vitest'

import { resolveForgeConfig } from '../packages/config/src/index.js'
import {
  collectDiagnostics,
  createGenerationPlan,
  detectResources,
  normalizeOpenApi,
  parseOpenApi,
} from '../packages/core/src/index.js'

const fixtureDir = join(process.cwd(), 'test/fixtures/openapi/real-world')
const expectedFixtures = [
  'demo-analytics.yaml',
  'demo-billing.yaml',
  'demo-catalog.yaml',
  'demo-content.yaml',
  'demo-customers.yaml',
  'demo-files.yaml',
  'demo-inventory.yaml',
  'demo-notifications.yaml',
  'demo-orders.yaml',
  'demo-reviews.yaml',
  'demo-search.yaml',
  'demo-workflows.yaml',
]

describe('Curated real-world OpenAPI fixtures', () => {
  test('cover synthetic CRUD schema patterns without requiring private local corpus access', async () => {
    const fixtures = (await readdir(fixtureDir)).filter((file) => file.endsWith('.yaml')).sort()
    const totals = {
      size: 0,
      operations: 0,
      resources: 0,
      generatedFiles: 0,
      diagnostics: 0,
    }

    expect(fixtures).toEqual(expectedFixtures)

    for (const fixture of fixtures) {
      const input = join(fixtureDir, fixture)
      totals.size += (await stat(input)).size

      const normalized = normalizeOpenApi(await parseOpenApi(input))
      const diagnostics = collectDiagnostics(normalized)
      const resources = detectResources(normalized.operations)
      const plan = await createGenerationPlan({
        config: resolveForgeConfig({ input }),
        normalized,
        resources,
        cwd: process.cwd(),
      })

      totals.operations += normalized.operations.length
      totals.resources += resources.length
      totals.generatedFiles += plan.files.length
      totals.diagnostics += diagnostics.length

      expect(plan.files.some((file) => file.path.endsWith('components.types.ts'))).toBe(true)
      expect(diagnostics).toEqual([])
    }

    expect(totals.size).toBeLessThan(1_000_000)
    expect(totals.operations).toBeGreaterThanOrEqual(120)
    expect(totals.resources).toBeGreaterThanOrEqual(24)
    expect(totals.generatedFiles).toBeGreaterThan(400)
    expect(totals.diagnostics).toBe(0)
  }, 30_000)
})
