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
    framework: 'vue',
    language: 'typescript',
    query: 'tanstack-vue-query',
    ui: 'archora-ui',
    architecture: 'feature-sliced',
  },
})
```

Defaults are applied when output or target options are omitted.
