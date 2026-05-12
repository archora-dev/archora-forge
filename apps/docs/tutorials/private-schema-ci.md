# Private Schema CI

Use this setup when the OpenAPI contract is behind an internal gateway, SwaggerHub, Postman export endpoint or service registry.

## Config

```ts
import { defineForgeConfig } from '@archora/forge-cli'

export default defineForgeConfig({
  input: 'https://contracts.example.com/openapi.yaml',
  schemaRequest: {
    headers: {
      authorization: 'Bearer ${OPENAPI_TOKEN}',
    },
    timeoutMs: 30000,
  },
  ci: {
    failOnDrift: true,
    failOnUnsupportedFeatures: true,
    minHealthScore: 85,
  },
})
```

Environment placeholders are resolved when the config loads. Do not commit tokens.

## CI Workflow

```yaml
name: Archora Forge

on:
  pull_request:
  push:
    branches: [main]

jobs:
  contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec archora-forge validate --report-file forge-validate.json
        env:
          OPENAPI_TOKEN: ${{ secrets.OPENAPI_TOKEN }}
      - run: pnpm exec archora-forge inspect --report-file forge-inspect.json
        env:
          OPENAPI_TOKEN: ${{ secrets.OPENAPI_TOKEN }}
      - run: pnpm exec archora-forge check --report markdown --report-file forge-check.md
        env:
          OPENAPI_TOKEN: ${{ secrets.OPENAPI_TOKEN }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: archora-forge-reports
          path: |
            forge-validate.json
            forge-inspect.json
            forge-check.md
```

For one-off local checks, pass headers without editing config:

```bash
pnpm exec archora-forge inspect https://contracts.example.com/openapi.yaml \
  --schema-header "authorization: Bearer $OPENAPI_TOKEN"
```
