# API Stability

Archora Forge v1 treats the following surfaces as stable within the v1 line:

- `archora-forge.config.ts` fields documented in Configuration
- CLI command names and JSON report top-level payloads for `inspect`, `validate`, `lint`, `generate --dry-run`, `diff`, `check`, `contract-diff`, `impact` and `doctor`
- package root exports for `@archora/forge-cli`, `@archora/forge-config`, `@archora/forge-core`, `@archora/forge-runtime`, `@archora/forge-adapters` and `@archora/forge-templates`
- generated file layout documented in Generated File Contract
- runtime client helpers from `@archora/forge-runtime`

Compatible v1 releases may add optional fields, new diagnostics, new generated files for new opt-in features, and support for additional OpenAPI constructs. They should not remove stable fields, rename stable files, or change existing JSON payload meanings without a major version.

## Guard Rails

The public contract is covered by `test/public-api-contract.test.ts`.

That suite checks:

- package runtime export names
- generated file paths for `test/fixtures/openapi/basic-crud.yaml`
- top-level JSON payload keys for the main CI-facing CLI commands

When a public surface changes intentionally, update this page and the contract test in the same commit.

## Report Shape Policy

CLI JSON reports keep stable top-level keys. Nested objects may gain optional fields as Forge learns more about OpenAPI contracts.

The `readiness` object is additive within v1. Current reports may include:

- `status`: `ready`, `needs-attention` or `blocked`;
- `gate.result`: `pass`, `warn` or `fail`;
- `gate.recommendedCiMode`: `comment` or `block`;
- `decision`;
- `blockers`;
- `warnings`;
- `nextActions`;
- `summary`.

Consumers should read by key and tolerate unknown fields. CI integrations should prefer:

- `ok`
- `diagnostics`
- `health` or `healthScore`
- `files`
- `drift`
- `schemas`
- `readiness.gate.result`

## Package Export Policy

Root package exports are the supported import surface. Deep imports into `src/` or `dist/` are internal and may change.

Supported examples:

```ts
import { createApiClient, queryParam } from '@archora/forge-runtime'
import { defineForgeConfig } from '@archora/forge-cli'
import { createGenerationPlan, parseOpenApi } from '@archora/forge-core'
```
