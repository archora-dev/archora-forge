# Limitations

Archora Forge 1.0 is in public preview/private beta for its documented generation workflow, with a deliberately focused scope. It is not positioned as production-ready.

## Current Scope

- TypeScript output.
- OpenAPI 3.x local files and remote schemas.
- Schema-derived types, clients and promise-based operation helpers.
- Schema-driven form/table metadata, permissions, i18n, mocks and regeneration safety.

## Known Gaps

- Framework component generation is intentionally out of core scope.
- UI-kit adapters are expected to live outside the core generator.
- Simple non-discriminated `oneOf` and `anyOf` unions are generated as broad unions; discriminator polymorphism remains diagnostic-only.
- Simple object `allOf` merge is supported only when branches are safe and non-conflicting.
- Multi-schema generation is supported for configured inputs and refuses duplicate generated paths; set distinct output directories for schemas that produce overlapping file names.
- Non-CRUD operation helpers type OpenAPI header parameters; CRUD resource helpers still expect per-call headers through runtime options.
- Transport behavior is minimal; OAuth refresh and typed error envelopes are application responsibilities.
- Zod and Valibot generation are experimental opt-in.
- TanStack-style integration is currently consumer-owned; Forge emits query keys and operation helpers, not a finished first-party TanStack adapter.
- Vue integration is through generated TypeScript clients, helpers and metadata; Forge does not emit Vue single-file components.
- Full OpenAPI coverage is not claimed.

## How Gaps Are Reported

Forge should keep producing partial useful output when a schema mixes supported and unsupported shapes. Unsupported cases are expected to appear as diagnostics and coverage counts, not as vague failures.

Current regression fixtures cover discriminator-heavy composition, cookie auth, operation-level security, unsupported request content types, binary transfer, nullable unions, unsafe names and header parameters.
