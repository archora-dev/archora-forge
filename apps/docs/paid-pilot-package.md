# Paid Pilot Package

This package is a practical first commercial offer for teams evaluating Archora Forge on a real schema.

Position the offer as a bounded self-serve adoption package. Do not sell it as a production-ready platform license or as unlimited OpenAPI coverage.

## Outcome

At the end of the pilot, the customer should know:

- whether Forge fits their API style;
- what generated code would look like in their frontend repo;
- which OpenAPI gaps block stronger generation;
- how CI drift checks would work;
- what integration work remains for their design system.

## Scope

Recommended pilot length: 1-2 weeks.

Included:

- 1-3 private OpenAPI schemas or one tightly bounded schema family;
- local or CI-based Forge setup;
- generated clients, operation helpers, metadata and mocks;
- schema validation, lint/readiness and drift review;
- HTML and Markdown `check` reports;
- generated TypeScript typecheck with `tsc --noEmit`;
- diagnostics triage;
- resource naming/config recommendations;
- one integration example with the customer's UI/table/form conventions;
- final adoption report.

Not included:

- full application screen generation;
- large framework migration;
- backend OpenAPI redesign;
- long-term maintenance without a support agreement.

## Deliverables

- `archora-forge.config.ts` tuned for the customer repo.
- Generated output branch or patch.
- HTML `inspect` report.
- HTML or Markdown `check` report with pilot readiness status, blockers, warnings and next actions.
- JSON `check` payload for CI or internal automation.
- Generated TypeScript typecheck result and failure summary if any generated code does not compile.
- Diagnostics summary with recommended OpenAPI fixes.
- Resource coverage summary: CRUD, read-only, search, dashboard, action and file operations.
- Short integration guide for the customer's frontend.
- Go/no-go recommendation for broader rollout.
- Completed pilot report using [Pilot Report Template](/pilot-report-template).

Recommended readiness commands:

```bash
archora-forge check ./openapi.yaml --report html --report-file forge-check.html
archora-forge check ./openapi.yaml --report markdown --report-file forge-check.md
archora-forge check ./openapi.yaml --json
tsc --noEmit -p ./generated-output-typecheck/tsconfig.json
```

## Suggested Pricing

Use this as a starting point, not a fixed rule:

- Small pilot: $2k-$5k.
- Enterprise schema pilot: $8k-$15k.
- Follow-up implementation/support: scoped separately.

Pricing should reflect schema complexity, access constraints and how much integration help is required.

## Success Criteria

- `archora-forge check` can run in CI.
- The `check` readiness section has no unresolved blockers, or accepted blockers are documented in the final adoption report.
- Generated output is deterministic and reviewable.
- Generated TypeScript passes typecheck, or every compile failure is tied to a named generator or schema issue.
- The customer sees useful frontend metadata, not just client methods.
- Unsupported OpenAPI features are explicit and documented.
- The team has a clear path to adopt or reject Forge based on evidence.

## Preview Boundaries

- The pilot covers a bounded schema or schema family, not unlimited OpenAPI support.
- Zod and Valibot output are experimental opt-in modes.
- TanStack-style usage requires a customer-owned wrapper today.
- Forge does not generate Vue pages, routes or design-system components.
- Private pilot artifacts should stay private unless explicitly cleared for publication.
