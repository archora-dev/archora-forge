# Multi-schema Monorepo

Use `inputs` when a frontend app consumes several service contracts.

## Config

```ts
import { defineForgeConfig } from '@archora/forge-cli'

export default defineForgeConfig({
  inputs: [
    {
      name: 'users',
      path: './contracts/users.yaml',
      output: {
        generatedDir: './src/shared/api/generated/users-service',
      },
    },
    {
      name: 'billing',
      path: './contracts/billing.yaml',
      output: {
        generatedDir: './src/shared/api/generated/billing-service',
      },
    },
  ],
})
```

Each input should write to a distinct generated directory. Forge refuses generation plans that would write duplicate generated paths from multiple schemas.

## Commands

Run commands without a schema argument to use every configured input:

```bash
pnpm exec archora-forge validate --json
pnpm exec archora-forge inspect --json
pnpm exec archora-forge generate --dry-run --json
pnpm exec archora-forge check --json
```

JSON reports keep a top-level aggregate and a `schemas` array with per-input detail.

## CI Pattern

```bash
pnpm exec archora-forge validate --report-file forge-validate.json
pnpm exec archora-forge lint --report-file forge-lint.json
pnpm exec archora-forge check --report markdown --report-file forge-check.md
```

Upload the reports once per frontend workspace. The report payload identifies each schema by `name`.
