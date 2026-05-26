# CI Adoption Kit

Archora Forge can run in CI without writing generated files. Use it to validate the OpenAPI contract, review frontend-readiness diagnostics, inspect the generation plan, detect generated-output drift and keep reviewable adoption reports.

## Recommended Pipeline

For a first pull-request gate, run the commands in this order:

```bash
archora-forge validate ./openapi.yaml --json --report-file forge-validate.json
archora-forge inspect ./openapi.yaml --json --report-file forge-inspect.json
archora-forge lint ./openapi.yaml --json --report-file forge-lint.json
archora-forge impact ./openapi.yaml --base origin/main --repo . --json --report-file forge-impact.json --pr-comment-file forge-impact-pr.md
archora-forge diff ./openapi.yaml --json --report-file forge-diff.json
archora-forge generate ./openapi.yaml --dry-run --json --report-file forge-generate.json
archora-forge check ./openapi.yaml --report markdown --report-file forge-check.md
archora-forge check ./openapi.yaml --report html --report-file forge-check.html
```

Use the installed binary in consumer repositories. During local Forge development, replace `archora-forge` with `node packages/cli/dist/index.js`.

For contract-change pull requests, start with [CI Impact Kit](/ci-impact-kit).

## Strict And Advisory Modes

Use strict mode when Forge should block a pull request. Use advisory mode when a team is introducing Forge and wants reports without making every diagnostic a merge blocker.

Strict generated-output gate:

```bash
archora-forge check ./openapi.yaml --report markdown --report-file forge-check.md
```

`check` reads the `ci` block from config. This is the recommended merge gate once generated output is committed.

Advisory schema-readiness report:

```bash
archora-forge lint ./openapi.yaml --json --report-file forge-lint.json || true
```

Advisory mode should still upload the report. Do not hide the result in the report itself; only decide at the workflow level whether the job blocks.

Project policy can be tuned in config:

```ts
import { defineForgeConfig } from '@archora/forge-cli'

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

Use `--min-health-score <score>` for one-off gates:

```bash
archora-forge check ./openapi.yaml --min-health-score 85
```

## Exit Codes

| Command | Exit `0` | Exit `1` | Exit `2` |
| --- | --- | --- | --- |
| `validate` | Schema/config loads and, unless `--strict` is used, parseable diagnostics are report-only. | `--strict` is set and diagnostics are present. | Schema/config/runtime failure. |
| `lint` | Frontend-readiness diagnostics pass under the selected lint policy. | Frontend-readiness diagnostics fail under the selected lint policy. | Schema/config/runtime failure. |
| `diff` | Generation plan was created successfully. | Not used for planned create/update/protected file counts. | Schema/config/runtime failure. |
| `impact` | Impact decision is `approved` or `review`. | Impact decision is `blocked`. | Schema/config/runtime failure. |
| `check` | No failed checks under the configured CI policy. | Drift or configured quality gates failed. | Schema/config/runtime failure. |
| `generate --dry-run` | Generation plan and write summary were produced without writing files. | Not used for planned generated-file changes. | Schema/config/runtime failure. |

When a command is run with `--json`, command-level failures are reported as:

```json
{
  "ok": false,
  "error": "..."
}
```

## Artifact Policy

Upload artifacts even when a gate fails. Keep machine-readable JSON for automation and Markdown or HTML for human review.

Recommended artifacts:

| Artifact | Format | Purpose |
| --- | --- | --- |
| `forge-validate.json` | JSON | Parse/config status, schema health and raw diagnostics. |
| `forge-inspect.json` | JSON | Resource counts, operation categories and detected CRUD gaps. |
| `forge-lint.json` | JSON | Frontend-readiness diagnostics and score. |
| `forge-diff.json` | JSON | Planned create/update/protected generated-file counts. |
| `forge-generate.json` | JSON | Dry-run write summary and prune candidates. |
| `forge-check.json` | JSON | CI payload for automation, drift, failed checks and readiness. |
| `forge-check.md` | Markdown | Pull-request comment or handoff summary. |
| `forge-check.html` | HTML | Stakeholder-friendly adoption report artifact. |

JSON report artifacts include `ok` and the resolved `schema`. Commands that load config also include `configPath`.

For the report fields used during adoption review, see [Adoption Report](/adoption-report) and [Schema Coverage Matrix](/schema-coverage-matrix).

## GitHub Actions Workflow

Use this as the starting point for an existing frontend repository:

```yaml
name: Archora Forge

on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

jobs:
  forge:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9.15.4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build application packages
        run: pnpm build

      - name: Validate OpenAPI contract
        run: pnpm exec archora-forge validate ./openapi.yaml --json --report-file forge-validate.json

      - name: Inspect generated resource model
        run: pnpm exec archora-forge inspect ./openapi.yaml --json --report-file forge-inspect.json

      - name: Lint frontend readiness
        run: pnpm exec archora-forge lint ./openapi.yaml --json --report-file forge-lint.json

      - name: Review generation plan
        run: pnpm exec archora-forge diff ./openapi.yaml --json --report-file forge-diff.json

      - name: Dry-run generation
        run: pnpm exec archora-forge generate ./openapi.yaml --dry-run --json --report-file forge-generate.json

      - name: Check drift and readiness
        run: pnpm exec archora-forge check ./openapi.yaml --report html --report-file forge-check.html

      - name: Write Markdown check report
        if: always()
        run: pnpm exec archora-forge check ./openapi.yaml --report markdown --report-file forge-check.md || true

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
            forge-check.html
```

For an advisory rollout, add `continue-on-error: true` to the `Lint frontend readiness` or `Check drift and readiness` steps while the team is fixing schema and generated-output gaps. Keep artifact upload unchanged.

## Pull-Request Workflow

1. Create a branch in the consuming frontend repository.
2. Add `archora-forge.config.ts` with the schema path and output directories.
3. Run `archora-forge diff ./openapi.yaml` and review the planned generated files.
4. Run `archora-forge generate ./openapi.yaml` and commit the generated output.
5. Run `archora-forge check ./openapi.yaml --report markdown --report-file forge-check.md`.
6. Open a pull request containing the config, generated files and CI workflow.
7. Review generated TypeScript like application code. Do not edit Forge-owned generated files by hand.
8. If CI reports drift, regenerate and commit the generated output or document why the drift is intentionally deferred.

## Adoption Checklist

- Confirm the OpenAPI schema path is stable in the repository.
- Decide whether generated output is committed in the same PR as the Forge config.
- Choose strict or advisory CI mode for the first rollout.
- Set `ci.failOnDrift` before making `check` a required status.
- Pick a health-score threshold only after reviewing current diagnostics.
- Upload JSON reports for automation and Markdown or HTML reports for review.
- Document who owns schema fixes versus frontend integration fixes.
- Re-run `check` after rebases that change the schema, config or generated files.

## Common Failures

- Drift means the committed generated output does not match the current schema, config or Forge version.
- Unsupported features mean Forge produced diagnostics for OpenAPI constructs outside the current frontend resource-layer support boundary.
- Missing schemas mean operations are missing request or response schemas needed for strong generated contracts.
- Health-score failures mean the schema parsed, but the configured threshold was not met.
- Runtime failures usually mean the schema path, config path, package installation or remote schema access failed.
