# Quick Start

This path takes a frontend repository from a public demo package to a PR impact report, then to committed typed resource files.

## 1. Install

```bash
pnpm add -D @archora/forge-cli @archora/forge-adapters
```

## 2. Open The Demo Package

```bash
pnpm exec archora-forge demo --out forge-demo
```

Open these files first:

- `forge-demo/report/impact-pr.md`;
- `forge-demo/report/check.html`;
- `forge-demo/report/audit/index.html`;
- `forge-demo/report/go-no-go.md`.

The demo shows the artifact set before you point Forge at a private schema.

## 3. Create Config

```bash
pnpm exec archora-forge init --input ./openapi.yaml
```

This creates `archora-forge.config.ts`. Keep the OpenAPI file local at first; remote private schemas can be added later.

## 4. Inspect The Contract

```bash
pnpm exec archora-forge doctor
pnpm exec archora-forge inspect
```

`doctor` checks the project setup. `inspect` reports detected resources, schema health and diagnostics.

## 5. Review PR Impact Before Merge

For a branch that changes `openapi.yaml`, compare it with the schema on the base branch:

```bash
pnpm exec archora-forge impact ./openapi.yaml \
  --base origin/main \
  --repo . \
  --report markdown \
  --report-file forge-impact.md \
  --pr-comment-file forge-impact-pr.md
```

Review `forge-impact-pr.md` before regenerating. It should answer:

- whether the change blocks merge;
- which resources and generated files are affected;
- which operation IDs, client methods and query hooks changed;
- which source files already use the impacted API surface;
- what the frontend team should change next.

## 6. Review Generated Files

```bash
pnpm exec archora-forge generate --dry-run --json
pnpm exec archora-forge diff
```

Review the file plan before writing. Forge generates TypeScript clients, query keys, operation helpers, resource metadata, permissions, i18n and mocks.

## 7. Generate

```bash
pnpm exec archora-forge generate
```

Commit the generated files. They are designed to be reviewed like normal source code.

Generated TypeScript files include Forge ownership and metadata headers. `check` uses them to report whether committed output matches the current CLI version, OpenAPI schema and config.

To preview stale Forge-owned files before cleanup:

```bash
pnpm exec archora-forge generate --dry-run --prune --json
```

To remove stale Forge-owned files after reviewing the preview:

```bash
pnpm exec archora-forge generate --prune
```

## 8. Use The Client

```ts
import { configureUsersClient, usersClient } from './src/shared/api/generated/users/users.client'

configureUsersClient({
  baseUrl: 'https://api.example.com',
  auth: { type: 'bearer', token: async () => getAccessToken() },
})

const users = await usersClient.listUsers({ page: 1 })
```

Generated clients stay framework-neutral. Use them from React Query, Angular services, Vue composables, Svelte stores or internal UI-kit adapters.

## 9. Add CI

```bash
pnpm exec archora-forge ci init github --schema ./openapi.yaml --base origin/main --mode impact --gate block
pnpm exec archora-forge validate --report-file forge-validate.json
pnpm exec archora-forge lint --report-file forge-lint.json
pnpm exec archora-forge check --report markdown --report-file forge-check.md
pnpm exec archora-forge check --report html --report-file forge-check.html
```

Use `--gate block` when blocked API impact should fail the pull request after the comment and artifacts are written. Use `--gate comment` for trial branches where the team wants visibility before enforcement. Upload the reports as CI artifacts. `check` fails when generated files drift or configured quality gates fail. Its reports include generator metadata and pilot readiness sections for adoption reviews; it is not a guarantee that every production OpenAPI shape is supported.

## Local Repo Smoke Test

When working inside the Archora Forge repo itself:

```bash
pnpm install
pnpm build
node packages/cli/dist/index.js generate test/fixtures/openapi/basic-crud.yaml --dry-run
```
