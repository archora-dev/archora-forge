# Audit Command

`archora-forge audit` creates the self-serve adoption package. It is the fastest way to show what Forge found, what it generated and whether the output is ready to buy or adopt.

```bash
archora-forge audit ./openapi.yaml --out forge-audit
```

## Artifacts

The command writes:

```txt
forge-audit/
  index.html
  report.md
  report.json
  typecheck.md
  ci.yml
  adoption-plan.md
  generated-preview/
  generated-output-typecheck/
```

## What The HTML Report Shows

- frontend API scorecard;
- readiness decision;
- schema coverage matrix;
- resource explorer;
- generated files by category;
- schema fix suggestions;
- generated TypeScript typecheck result;
- drift and diagnostics;
- copyable CI summary.

## Typecheck Gate

By default, `audit` writes generated TypeScript into a temporary workspace under the audit output and runs:

```bash
pnpm exec tsc -p forge-audit/generated-output-typecheck/tsconfig.json
```

Use `--skip-typecheck` only when TypeScript is not available in the current environment.

## CI Use

The generated `ci.yml` is a starting point. Keep the whole `forge-audit/` folder as a CI artifact, not as committed generated app code.

```bash
archora-forge audit ./openapi.yaml --out forge-audit
```

Exit codes:

- `0`: audit passed under the current gate.
- `1`: audit completed, but readiness gates failed.
- `2`: command/config/schema error.
