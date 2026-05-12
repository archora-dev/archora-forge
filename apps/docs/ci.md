# CI Mode

Archora Forge can check generated output without writing files:

```bash
archora-forge check ./openapi.yaml
archora-forge check ./openapi.yaml --json
archora-forge check ./openapi.yaml --report markdown
archora-forge check ./openapi.yaml --report markdown --report-file forge-check.md
archora-forge check ./openapi.yaml --report json --report-file forge-check.json
archora-forge check ./openapi.yaml --min-health-score 85
```

For pull requests, keep machine-readable artifacts for every stage you want to inspect later:

```bash
archora-forge validate ./openapi.yaml --report-file forge-validate.json
archora-forge inspect ./openapi.yaml --report-file forge-inspect.json
archora-forge lint ./openapi.yaml --report-file forge-lint.json
archora-forge diff ./openapi.yaml --report-file forge-diff.json
archora-forge generate ./openapi.yaml --dry-run --report-file forge-generate.json
archora-forge check ./openapi.yaml --report markdown --report-file forge-check.md
```

JSON report artifacts include `ok` and the resolved `schema`; commands that load config also include `configPath`.

`check` builds the generation plan in memory, compares generated files with the current workspace, reports diagnostics, applies `ci` policy from config, and exits with CI-friendly codes:

- `0`: generated output is current and no critical diagnostics were found.
- `1`: generated output has drift or critical diagnostics.
- `2`: schema/config/runtime failure.

JSON and markdown reports include `failedChecks`, which can contain `drift`, `errors`, `warnings`, `unsupported-features` or `missing-schemas`.
Reports also include the lowest `healthScore` across configured schemas.
Use `--min-health-score <score>` for one-off CI gates, or put `minHealthScore` in config for the default project policy.

CI policy can be tuned in config:

```ts
export default defineForgeConfig({
  input: './openapi.yaml',
  ci: {
    failOnDrift: true,
    failOnUnsupportedFeatures: true,
    failOnWarnings: false,
    failOnMissingSchemas: false,
    minHealthScore: 85,
  },
})
```

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
      - run: node packages/cli/dist/index.js validate ./openapi.yaml --report-file forge-validate.json
      - run: node packages/cli/dist/index.js inspect ./openapi.yaml --report-file forge-inspect.json
      - run: node packages/cli/dist/index.js lint ./openapi.yaml --report-file forge-lint.json
      - run: node packages/cli/dist/index.js diff ./openapi.yaml --report-file forge-diff.json
      - run: node packages/cli/dist/index.js generate ./openapi.yaml --dry-run --report-file forge-generate.json
      - run: node packages/cli/dist/index.js check ./openapi.yaml --report markdown --report-file forge-check.md
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: archora-forge-reports
          path: |
            forge-validate.json
            forge-inspect.json
            forge-lint.json
            forge-diff.json
            forge-generate.json
            forge-check.md
```

Package consumers can use the installed binary once the package is available in their registry:

```yaml
- run: archora-forge check ./openapi.yaml
```
