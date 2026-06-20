import { describe, expect, test } from 'vitest'

import { resolveForgeConfig } from '../packages/config/src/index.js'
import { createTeamForgePreset } from '../examples/config-preset/preset.js'

describe('shareable config preset', () => {
  test('applies team defaults on top of the feature-sliced preset', () => {
    const resolved = resolveForgeConfig(createTeamForgePreset({ input: './openapi.yaml' }))

    expect(resolved.validation).toBe('zod')
    expect(resolved.mocks.adapter).toBe('msw')
    expect(resolved.naming.resourceCase).toBe('kebab')
    expect(resolved.ci.minHealthScore).toBe(90)
    expect(resolved.ci.failOnDrift).toBe(true)
    expect(resolved.output.featuresDir).toBe('./src/features')
    expect(resolved.target.architecture).toBe('feature-sliced')
  })

  test('consumer overrides win over preset defaults', () => {
    const resolved = resolveForgeConfig(
      createTeamForgePreset({
        input: './openapi.yaml',
        validation: 'valibot',
        target: { query: 'tanstack-query' },
      }),
    )

    expect(resolved.validation).toBe('valibot')
    expect(resolved.target.query).toBe('tanstack-query')
  })
})
