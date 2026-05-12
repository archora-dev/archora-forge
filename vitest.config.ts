import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@archora/forge-adapters': fileURLToPath(new URL('./packages/adapters/src/index.ts', import.meta.url)),
      '@archora/forge-config': fileURLToPath(new URL('./packages/config/src/index.ts', import.meta.url)),
      '@archora/forge-core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
      '@archora/forge-runtime': fileURLToPath(new URL('./packages/runtime/src/index.ts', import.meta.url)),
      '@archora/forge-templates': fileURLToPath(new URL('./packages/templates/src/index.ts', import.meta.url)),
    },
  },
  test: {
    globals: true,
    include: ['test/**/*.test.ts', 'packages/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
})
