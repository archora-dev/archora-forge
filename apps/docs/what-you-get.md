# What You Get

Archora Forge is not just an OpenAPI client generator. The output is a reviewable frontend API adoption package.

## Audit Report

One command produces a buyer-facing report:

```bash
archora-forge audit ./openapi.yaml --out forge-audit
```

The report includes scorecard, readiness decision, drift, diagnostics, schema coverage, resource explorer, typecheck result and next actions.

## Generated Resource Layer

Forge generates plain TypeScript:

- clients;
- request and response types;
- query keys;
- operation helpers;
- form/table metadata;
- permissions;
- i18n label scaffolds;
- mocks.

The consuming app keeps ownership of UI, routing, state management and design-system components.

## Typecheck Proof

The audit package checks generated output with TypeScript:

```bash
pnpm exec tsc -p forge-audit/generated-output-typecheck/tsconfig.json
```

This catches invalid identifiers, bad imports, wrong aliases and helper wiring problems before the generated code is adopted.

## CI Workflow

The audit package writes `ci.yml` as a starting point for pull request checks. Keep `forge-audit/` as a CI artifact so teams can review HTML, Markdown and JSON outputs.

## Adoption Plan

The package writes `adoption-plan.md` with:

- decision;
- next actions;
- acceptance gates;
- first resource candidates.

That lets a buyer decide from artifacts instead of a live walkthrough.
