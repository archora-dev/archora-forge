# See The Audit Report

Open the public CRM audit report:

<a href="/demo-audit/" target="_blank" rel="noreferrer">View the generated audit report</a>

This report is generated from the fictional public CRM schema. It contains no private customer data.

## What To Look At

- **Frontend API Scorecard**: readiness, type safety, resource coverage, drift safety and CI adoption.
- **Generated TypeScript Typecheck**: proof that generated output compiles in an isolated TypeScript workspace.
- **Resource Explorer**: detected resources, operations and generated files.
- **Schema Coverage Matrix**: generated, fallback and diagnostic-only coverage.
- **Schema Fix Suggestions**: what to change when diagnostics exist.
- **Audit Package**: the files a buyer can attach to internal review.

## Reproduce It

From the repository root:

```bash
pnpm build
node packages/cli/dist/index.js audit \
  --config examples/public-crm/archora-forge.config.ts \
  --out apps/docs/public/demo-audit
```

For a private schema, use:

```bash
pnpm exec archora-forge audit ./openapi.yaml --out forge-audit
```

Then open:

```txt
forge-audit/index.html
```
