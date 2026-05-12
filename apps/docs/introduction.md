# Introduction

OpenAPI generators give you a client. **Archora Forge gives you a frontend module.**

Archora Forge is a local-first developer tool that turns OpenAPI 3.x contracts into typed Vue frontend modules. It generates the client layer plus the surrounding frontend architecture: query keys, composables, forms, tables, pages, routes, permissions, i18n and mocks.

The current MVP targets Vue 3 and TypeScript. The output is intended to be committed, reviewed and regenerated safely as the API contract evolves.

## What Makes It Different

Client-only generators solve one slice of the problem. Archora Forge starts from resources and generates the module shape a frontend team usually builds around that client:

```txt
openapi.yaml
  -> shared/api/generated/users/
  -> features/users/
  -> pages/users/
  -> shared/mocks/users/
```

Generated files stay separate from custom wrappers so application teams can keep product-specific behavior without losing regeneration.
