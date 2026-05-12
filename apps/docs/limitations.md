# Limitations

Archora Forge is being prepared for public preview, but still intentionally scoped.

## Current Scope

- Vue 3 target.
- TypeScript output.
- OpenAPI 3.x local files.
- Schema-derived types, clients and composables.
- Schema-driven form/table scaffolds, pages, mocks and regeneration safety.

## Known Gaps

- `oneOf`, `anyOf` and discriminator polymorphism are diagnostic-only.
- Simple object `allOf` merge is supported only when branches are safe and non-conflicting.
- Transport behavior is minimal; bearer/API key presets exist, while OAuth refresh, retries and typed error envelopes are future work.
- The current Archora UI integration is a fallback adapter plus an opt-in real `@archora/ui` import mode.
- TanStack Vue Query and Zod generation are experimental opt-in modes with isolated generated TypeScript proof, not complete app integrations.
- Multi-schema workspaces, Nuxt-specific output, Plugin API, Valibot validation and browser E2E are not complete.
- Package versions and generated output are preview-level and not stable public API promises.
- React support is planned later, not in the current MVP.

These gaps are roadmap items, not hidden requirements for the current demo flow.
