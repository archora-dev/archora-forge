import { defineForgeConfig } from '@archora/forge-config'

export default defineForgeConfig({
  input: './openapi.yaml',
  output: {
    generatedDir: './generated/src/shared/api/generated',
    featuresDir: './generated/src/features',
    mocksDir: './generated/src/shared/mocks',
  },
  target: {
    framework: 'neutral',
    language: 'typescript',
    query: 'vue-query',
    ui: 'metadata',
    architecture: 'feature-sliced',
  },
  mocks: {
    adapter: 'simple',
  },
})
