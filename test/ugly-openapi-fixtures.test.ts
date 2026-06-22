import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, test } from 'vitest'

import { resolveForgeConfig } from '../packages/config/src/index.js'
import {
  collectDiagnostics,
  createGenerationPlan,
  createSchemaCoverageMatrix,
  detectResources,
  normalizeOpenApi,
  parseOpenApi,
} from '../packages/core/src/index.js'

const fixtureDir = join(process.cwd(), 'test/fixtures/openapi/ugly')
const expectedFixtures = ['composition-auth.yaml', 'files-nullable.yaml', 'names-params.yaml']

describe('Ugly OpenAPI fixtures', () => {
  test('parse, produce partial useful output, and report unsupported cases explicitly', async () => {
    const fixtures = (await readdir(fixtureDir)).filter((file) => file.endsWith('.yaml')).sort()
    const allDiagnostics = new Set<string>()
    const totals = {
      operations: 0,
      resources: 0,
      generatedFiles: 0,
      diagnosticOnly: 0,
      fallbackCases: 0,
    }

    expect(fixtures).toEqual(expectedFixtures)

    for (const fixture of fixtures) {
      const input = join(fixtureDir, fixture)
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

      totals.operations += normalized.operations.length
      totals.resources += resources.length
      totals.generatedFiles += plan.files.length
      totals.diagnosticOnly += coverage.cases.diagnosticOnly
      totals.fallbackCases += coverage.cases.fallback
      for (const diagnostic of diagnostics) allDiagnostics.add(diagnostic.code)

      expect(plan.files.some((file) => file.path.endsWith('components.types.ts'))).toBe(true)
      expect(plan.files.some((file) => file.path.includes('/shared/api/generated/'))).toBe(true)
      expect(plan.files.some((file) => file.path.endsWith('.vue'))).toBe(false)
    }

    expect(totals.operations).toBeGreaterThanOrEqual(9)
    expect(totals.resources).toBeGreaterThanOrEqual(5)
    expect(totals.generatedFiles).toBeGreaterThan(50)
    // Mergeable inheritance-style allOf is now flattened into concrete types and counts as
    // supported coverage, so these fixtures no longer report schema-level diagnostic-only
    // cases. Explicit unsupported reporting is still asserted through the diagnostics below.
    expect(allDiagnostics.size).toBeGreaterThan(0)
    expect(totals.fallbackCases).toBeGreaterThan(0)
    expect([...allDiagnostics].sort()).toEqual(
      expect.arrayContaining([
        'unsupported-security-schemes',
        'unsupported-operation-security',
        'unsupported-header-parameter',
        'unsupported-content-type',
      ]),
    )
    // Object-branch discriminated unions (EventEnvelope) are generated as narrowing
    // TypeScript unions now, so they no longer surface as unsupported.
    expect(allDiagnostics.has('unsupported-discriminator')).toBe(false)
  })
})
