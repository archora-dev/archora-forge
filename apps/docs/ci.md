# CI Mode

Archora Forge can check generated output without writing files:

```bash
archora-forge check ./openapi.yaml
archora-forge check ./openapi.yaml --json
archora-forge check ./openapi.yaml --report markdown
```

`check` builds the generation plan in memory, compares generated files with the current workspace, reports diagnostics, and exits with CI-friendly codes:

- `0`: generated output is current and no critical diagnostics were found.
- `1`: generated output has drift or critical diagnostics.
- `2`: schema/config/runtime failure.

Example monorepo workflow:

```yaml
name: Archora Forge

on:
  pull_request:
  push:
    branches: [main]

jobs:
  forge-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: node packages/cli/dist/index.js check examples/vue-admin/openapi.yaml
```

Package consumers can use the installed binary once the package is available in their registry:

```yaml
- run: archora-forge check ./openapi.yaml
```
