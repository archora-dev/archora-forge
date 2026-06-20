# Shareable config preset

Forge config is plain TypeScript, so a team can ship its conventions as a reusable
preset — the same pattern as `eslint-config-*`. Every repo then extends one source of
truth instead of copy-pasting `archora-forge.config.ts`.

## The preset

`preset.ts` exports `createTeamForgePreset`, which layers team conventions (zod
validation, MSW mocks, CI thresholds, naming) on top of the built-in `feature-sliced`
preset:

```ts
import { createForgeConfigPreset, type ForgeConfig } from '@archora/forge-config'

export function createTeamForgePreset(config: ForgeConfig): ForgeConfig {
  return createForgeConfigPreset('feature-sliced', {
    validation: 'zod',
    mocks: { adapter: 'msw' },
    naming: { resourceCase: 'kebab', fileCase: 'pascal' },
    ci: { failOnDrift: true, failOnUnsupportedFeatures: true, minHealthScore: 90 },
    ...config,
  })
}
```

## Consuming it

Publish the preset (e.g. `@your-org/forge-config`) and extend it per repo. Consumer
overrides always win:

```ts
// archora-forge.config.ts
import { createTeamForgePreset } from '@your-org/forge-config'

export default createTeamForgePreset({
  input: './openapi.yaml',
  target: { query: 'tanstack-query' }, // override on top of the shared defaults
})
```

`pnpm --filter forge-config-preset-demo typecheck` checks that the preset and a
consuming config type-check together.
