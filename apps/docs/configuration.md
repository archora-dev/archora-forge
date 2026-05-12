# Configuration

Archora Forge exposes `defineForgeConfig()` from `@archora/forge-config`.

```ts
import { defineForgeConfig } from '@archora/forge-config'

export default defineForgeConfig({
  input: './openapi.yaml',
  output: {
    root: './src',
    generatedDir: './src/shared/api/generated',
    featuresDir: './src/features',
    pagesDir: './src/pages',
    mocksDir: './src/shared/mocks',
  },
  target: {
    framework: 'neutral',
    language: 'typescript',
    query: 'promise',
    ui: 'metadata',
    architecture: 'feature-sliced',
  },
})
```

Defaults are applied when output or target options are omitted.

Use `inputs` instead of `input` for multi-schema monorepos. `doctor`, `inspect`, `validate`, `lint`, `check`, `diff` and `generate` aggregate configured inputs when no schema argument is passed. Set a distinct `output.generatedDir` per input; `generate` refuses duplicate generated paths.

## CI Policy

`archora-forge check` reads the `ci` block when deciding whether to exit with `0` or `1`:

```ts
export default defineForgeConfig({
  input: './openapi.yaml',
  ci: {
    failOnDrift: true,
    failOnUnsupportedFeatures: true,
    failOnWarnings: false,
    failOnMissingSchemas: false,
    minHealthScore: 85,
  },
})
```

Use `failOnDrift: false` when you want a report-only drift artifact during adoption.
Use `minHealthScore` when CI should enforce a minimum OpenAPI health score before generated output is accepted.
