# Archora Forge Release Candidate Checklist

Status: not ready for public GA; acceptable for public preview with limitations documented.

## Supported Scenarios

- Local OpenAPI 3.x file parsing.
- Vue 3 TypeScript module generation.
- Typed clients, query keys and typed composable helpers.
- Schema-driven form and table scaffolds.
- Minimal fetch-based runtime with JSON requests/responses.
- Diagnostics for missing schemas and known unsupported OpenAPI features.
- Fixture-based hardening tests for unusual names, path params, runtime and drift.
- CI check command for generated output drift.

## Unsupported Scenarios

- React target.
- SaaS/cloud workflow.
- Full OpenAPI composition modeling for `oneOf`, `anyOf`, `allOf` and discriminators.
- Multipart/file upload generation.
- Security scheme to auth client generation.
- Production-grade HTTP transport features such as retries, refresh tokens and typed error envelopes.

## Verification Commands

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter docs build
pnpm --filter vue-admin typecheck
pnpm --filter vue-admin build
node packages/cli/dist/index.js inspect examples/vue-admin/openapi.yaml
node packages/cli/dist/index.js validate examples/vue-admin/openapi.yaml
node packages/cli/dist/index.js diff examples/vue-admin/openapi.yaml
node packages/cli/dist/index.js check examples/vue-admin/openapi.yaml
cd examples/vue-admin && node ../../packages/cli/dist/index.js generate openapi.yaml --dry-run
./scripts/smoke-external-consumer.sh
```

## Do Not Claim

- Full OpenAPI support.
- Production transport.
- Real TanStack Vue Query integration.
- Auth/security scheme generation.
- React generation.
