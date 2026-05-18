# Quick Start

This path takes a frontend repository from an OpenAPI contract to committed typed resource files.

## 1. Install

```bash
pnpm add -D @archora/forge-cli @archora/forge-adapters
```

## 2. Create Config

```bash
pnpm exec archora-forge init --input ./openapi.yaml
```

This creates `archora-forge.config.ts`. Keep the OpenAPI file local at first; remote private schemas can be added later.

## 3. Inspect The Contract

```bash
pnpm exec archora-forge doctor
pnpm exec archora-forge inspect
```

`doctor` checks the project setup. `inspect` reports detected resources, schema health and diagnostics.

## 4. Review Generated Files

```bash
pnpm exec archora-forge generate --dry-run --json
pnpm exec archora-forge diff
```

Review the file plan before writing. Forge generates TypeScript clients, query keys, operation helpers, resource metadata, permissions, i18n and mocks.

## 5. Generate

```bash
pnpm exec archora-forge generate
```

Commit the generated files. They are designed to be reviewed like normal source code.

## 6. Use The Client

```ts
import { configureUsersClient, usersClient } from './src/shared/api/generated/users/users.client'

configureUsersClient({
  baseUrl: 'https://api.example.com',
  auth: { type: 'bearer', token: async () => getAccessToken() },
})

const users = await usersClient.listUsers({ page: 1 })
```

Generated clients stay framework-neutral. Use them from React Query, Angular services, Vue composables, Svelte stores or internal UI-kit adapters.

## 7. Add CI

```bash
pnpm exec archora-forge validate --report-file forge-validate.json
pnpm exec archora-forge lint --report-file forge-lint.json
pnpm exec archora-forge check --report markdown --report-file forge-check.md
pnpm exec archora-forge check --report html --report-file forge-check.html
```

Upload the reports as CI artifacts. `check` fails when generated files drift or configured quality gates fail. Its reports include a pilot readiness section for adoption reviews; it is not a guarantee that every production OpenAPI shape is supported.

## Local Repo Smoke Test

When working inside the Archora Forge repo itself:

```bash
pnpm install
pnpm build
node packages/cli/dist/index.js generate test/fixtures/openapi/basic-crud.yaml --dry-run
```
