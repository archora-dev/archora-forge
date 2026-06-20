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
  // Bakes the license verification public key into release builds so Pro enforcement
  // cannot be bypassed by omitting an env var. The key is public (verify-only); set
  // ARCHORA_FORGE_RELEASE_PUBLIC_KEY_JWK at build time for an enforced release. Empty in
  // dev builds, where license.ts falls back to the runtime env var.
  define: {
    __ARCHORA_FORGE_PUBLIC_KEY_JWK__: JSON.stringify(
      process.env.ARCHORA_FORGE_RELEASE_PUBLIC_KEY_JWK ?? '',
    ),
  },
})
