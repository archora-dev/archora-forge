# Archora Forge

> ⚠ **Source-available, NOT open source.**
> This repository is published for inspection and evaluation only.
> **Any** use of the code or its generated output — commercial or
> non-commercial, personal or organizational, including hobby and
> educational projects — requires a paid commercial license from the
> author.
> See [`LICENSE`](./LICENSE) and [`COMMERCIAL-LICENSE.md`](./COMMERCIAL-LICENSE.md).
>
> Commercial licensing: **akotov@archora.dev** · Telegram **@akotofff**

---

Archora Forge turns an OpenAPI contract into a typed frontend resource layer and PR-ready impact reports.

Archora Forge is a local-first commercial developer tool. It is built for frontend teams that already have a framework and design system, but need a reliable contract layer between OpenAPI and product code. It generates committed TypeScript clients, operation helpers, query keys, form/table metadata, permissions, labels, mocks and CI reports without forcing a UI framework or hosted workflow.

Forge is suitable for self-serve evaluation and bounded commercial adoption packages with TypeScript frontend teams that want to evaluate one real schema in a branch. It is not positioned as unlimited production platform coverage for every OpenAPI contract.

It does not try to generate your application UI. Most teams already have a framework, a design system, a table component, a form library and strong opinions about how screens should look. Forge focuses on the part that is repetitive and easy to get wrong: the typed contract between an API schema and frontend code.

From one OpenAPI file, Forge can generate TypeScript clients, operation helpers, query keys, resource metadata, form/table metadata, permissions, labels and mocks. You can then map that metadata into React, Angular, Vue, Svelte, vanilla TypeScript or an internal UI kit.

## Why This Exists

OpenAPI client generators are useful, but they usually stop at the transport layer:

```txt
openapi.yaml -> client methods and types
```

Frontend teams still have to decide how resources are grouped, which fields are shown in tables, which fields belong in forms, how mocks are organized, how permissions are named and how to tell whether generated output is stale.

Archora Forge generates that resource contract:

```txt
openapi.yaml
  -> typed API clients
  -> operation helpers
  -> form/table metadata
  -> permissions and labels
  -> mocks
  -> PR impact reports
  -> drift checks
```

The output is plain TypeScript. Commit it, review it, regenerate it when the API changes.

## What It Is Not

Forge is not a UI builder.

It does not emit framework components, pages, drawers or generated HTML. That is intentional. The generated layer should fit into your existing frontend architecture instead of forcing one onto you.

## Quick Start

For the public demo:

```bash
pnpm install
pnpm build

node packages/cli/dist/index.js inspect --config examples/public-crm/archora-forge.config.ts
node packages/cli/dist/index.js lint --config examples/public-crm/archora-forge.config.ts --strict
node packages/cli/dist/index.js generate --config examples/public-crm/archora-forge.config.ts --dry-run
node packages/cli/dist/index.js check --config examples/public-crm/archora-forge.config.ts --report html --report-file examples/public-crm/forge-check.html
node packages/cli/dist/index.js audit --config examples/public-crm/archora-forge.config.ts --out /tmp/archora-forge-public-audit
```

See `apps/docs/public-demo-walkthrough.md` for the generated public CRM walkthrough.

For the self-serve purchase path, read:

- `apps/docs/see-impact-report.md`
- `apps/docs/see-audit-report.md`
- `apps/docs/ci-impact-kit.md`
- `apps/docs/install-trial-buy.md`
- `apps/docs/run-audit-quickstart.md`
- `apps/docs/what-you-get.md`
- `apps/docs/privacy-security.md`
- `apps/docs/competitive-positioning.md`
- `apps/docs/self-serve-purchase.md`
- `apps/docs/product-demo-package.md`
- `apps/docs/generated-output-typecheck.md`
- `apps/docs/pilot-report-template.md`
- `apps/docs/pilot-proof.md`

For local development in this repo:

```bash
pnpm install
pnpm build

node packages/cli/dist/index.js inspect test/fixtures/openapi/basic-crud.yaml
node packages/cli/dist/index.js diff test/fixtures/openapi/basic-crud.yaml
node packages/cli/dist/index.js generate test/fixtures/openapi/basic-crud.yaml --dry-run
```

For a clean “external consumer” check:

```bash
./scripts/smoke-external-consumer.sh
```

That script packs the CLI, installs it into `/tmp/archora-forge-consumer`, runs the installed `archora-forge` binary and verifies the generated files.

For v1 onboarding and compatibility guarantees, see `apps/docs/quick-start.md`, `apps/docs/api-stability.md` and `apps/docs/generated-file-contract.md`.

Once the packages are published, consumer usage should be:

```bash
pnpm add -D @archora/forge-cli @archora/forge-adapters
pnpm exec archora-forge init
pnpm exec archora-forge doctor ./openapi.yaml
pnpm exec archora-forge inspect ./openapi.yaml
pnpm exec archora-forge impact ./openapi.old.yaml ./openapi.yaml --repo . --pr-comment-file forge-impact-pr.md
pnpm exec archora-forge audit ./openapi.yaml --out forge-audit
pnpm exec archora-forge generate ./openapi.yaml
```

Before buying or adopting generated output, run `archora-forge check` and typecheck the generated TypeScript in a temporary workspace. The docs include a report template so the purchase decision can be made from artifacts instead of a live demo.

## CLI

```bash
archora-forge init
archora-forge doctor ./openapi.yaml
archora-forge inspect ./openapi.yaml
archora-forge validate ./openapi.yaml
archora-forge diff ./openapi.yaml
archora-forge lint ./openapi.yaml
archora-forge check ./openapi.yaml
archora-forge audit ./openapi.yaml
archora-forge contract-diff ./old-openapi.yaml ./new-openapi.yaml
archora-forge impact ./old-openapi.yaml ./new-openapi.yaml
archora-forge generate ./openapi.yaml
```

The normal workflow is:

```bash
archora-forge inspect ./openapi.yaml
archora-forge doctor ./openapi.yaml
archora-forge diff ./openapi.yaml
archora-forge audit ./openapi.yaml --out forge-audit
archora-forge impact ./old-openapi.yaml ./openapi.yaml --repo . --report markdown --report-file forge-impact.md --pr-comment-file forge-impact-pr.md
archora-forge generate ./openapi.yaml
archora-forge check ./openapi.yaml
```

## Generated Shape

For a `users` resource, the generated tree looks like this:

```txt
src/
  shared/
    api/generated/
      components.types.ts
      users/
        users.types.ts
        users.client.ts
        users.query-keys.ts
        index.ts
    mocks/users/
      users.fixtures.ts
      users.handlers.ts
      users.scenarios.ts
      index.ts
  features/users/
    api/
      useUsersQuery.ts
      useUserQuery.ts
      useCreateUserMutation.ts
      useUpdateUserMutation.ts
      useDeleteUserMutation.ts
      index.ts
    model/
      users.config.ts
      users.permissions.ts
      users.i18n.ts
      index.ts
```

`users.config.ts` is the key UI integration point. It contains neutral metadata for fields, columns and pagination.

Example:

```ts
export const usersConfig = {
  resource: 'users',
  fields: [
    { name: 'email', label: 'Email', input: 'email', required: true, nullable: false },
    {
      name: 'status',
      label: 'Status',
      input: 'select',
      required: true,
      nullable: false,
      enumValues: ['active', 'invited', 'disabled'],
    },
  ],
  columns: [
    { name: 'email', label: 'Email', cell: 'text', sortable: true, nullable: false },
    { name: 'status', label: 'Status', cell: 'badge', sortable: true, nullable: false },
  ],
} as const
```

## UI-kit Integration

Forge adapters help turn generated metadata into shapes your UI kit understands.

```ts
import { toFormFields, toTableColumns } from '@archora/forge-adapters'

import { usersConfig } from './src/features/users/model/users.config'

const columns = toTableColumns(usersConfig.columns)
const fields = toFormFields(usersConfig.fields)
```

From there, your app owns the final mapping:

```ts
const antdColumns = columns.map((column) => ({
  dataIndex: column.key,
  title: column.title,
  sorter: column.sortable,
}))
```

See [examples/ui-kit-integration](examples/ui-kit-integration) for a small consumer-owned mapping layer.

The same metadata can be mapped into React, Vue, Svelte or Angular. The docs include a short cookbook for each: [UI-kit Integration](apps/docs/ui-kit-integration.md).

## Runtime Validation

Forge can optionally emit Zod or Valibot schemas for request payload validation:

```ts
export default defineForgeConfig({
  input: './openapi.yaml',
  validation: 'zod',
})
```

When enabled, install Zod in the consuming app:

```bash
pnpm add zod
```

For Valibot:

```ts
export default defineForgeConfig({
  input: './openapi.yaml',
  validation: 'valibot',
})
```

```bash
pnpm add valibot
```

Validation output is experimental and conservative. It covers common object, dictionary, enum, `const`, string, string formats, number, boolean, nullable and array shapes, including primitive enum literals and OpenAPI 3.1 nullable type arrays. Recursive OpenAPI references are guarded with a lazy fallback so generation does not crash, while unsupported binary and non-JSON operations remain explicit diagnostics.

## Regeneration Safety

Use `diff`, `check` or `generate --dry-run` before writing files:

```bash
archora-forge diff ./openapi.yaml
archora-forge diff ./openapi.yaml --json
archora-forge check ./openapi.yaml
archora-forge generate ./openapi.yaml --dry-run
archora-forge generate ./openapi.yaml --dry-run --json
```

`check` is intended for CI. It reports generated-output drift and diagnostics without writing files.

## Supported Scope

Archora Forge 1.0 has a preview CLI and generated file contract for the documented scope.

Current scope:

- TypeScript output.
- OpenAPI 3.x contracts.
- Typed clients and operation helpers.
- Form/table metadata.
- Permissions, labels and mocks.
- Drift checks and contract diagnostics.

Known limits:

- Framework component generation is intentionally out of scope.
- Discriminator polymorphism and complex `allOf` are not deeply modeled yet.
- Transport behavior is intentionally small; OAuth refresh and typed error envelopes are application responsibilities.
- Zod and Valibot generation are experimental opt-in.
- Multi-schema generation is supported for configured inputs and requires distinct output directories when files would collide.
- TanStack-style usage is currently an integration pattern, not a finished first-party adapter.

## Development Verification

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
./scripts/smoke-external-consumer.sh
```
