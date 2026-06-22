import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  // @archora/forge-cli and @archora/forge-core stay external so the Pro layer shares the
  // running CLI's modules (notably the license gate and its activated key) instead of
  // bundling a second copy.
  external: [/^@archora\/forge-/],
})
