import { createForgeConfigPreset, type ForgeConfig } from '@archora/forge-config'

/**
 * Example of a shareable Forge config preset — the equivalent of an `eslint-config-*`
 * package. Publish this as `@your-org/forge-config` and have every repo extend it so
 * generated output stays consistent across the org.
 *
 * It layers team conventions (zod validation, MSW mocks, CI thresholds, naming) on top
 * of the built-in `feature-sliced` preset. Consumer overrides always win.
 */
export function createTeamForgePreset(config: ForgeConfig): ForgeConfig {
  return createForgeConfigPreset('feature-sliced', {
    validation: 'zod',
    mocks: { adapter: 'msw' },
    naming: { resourceCase: 'kebab', fileCase: 'pascal' },
    ci: { failOnDrift: true, failOnUnsupportedFeatures: true, minHealthScore: 90 },
    ...config,
  })
}
