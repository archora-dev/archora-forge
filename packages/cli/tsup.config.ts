import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  noExternal: [/^@archora\/forge-/],
  banner: {
    js: '#!/usr/bin/env node',
  },
})
