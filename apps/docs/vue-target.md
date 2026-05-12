# Vue Target

The first target is Vue 3 with TypeScript.

The current generator emits Vue SFC scaffolds for tables, forms, drawers, delete confirmations and pages. Query composables are generated as typed extension points around generated client operations; deeper TanStack Vue Query integration is planned as the next hardening step.
Generated composables now preserve the resource operation types. List composables accept typed query params, detail composables accept typed path ids, and mutations accept typed payloads.
