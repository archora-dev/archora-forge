# Paid Pilot Package

This package is the first commercial offer for teams evaluating Archora Forge on a real schema. Sell the pilot as evidence work: run impact and audit locally, inspect the generated resource layer, decide go/no-go.

Position the offer as a bounded local adoption package. Do not sell it as a production-ready platform license or as unlimited OpenAPI coverage.

## Outcome

At the end of the pilot, the customer should know:

- whether Forge catches useful frontend API impact before merge;
- whether Forge fits their API style;
- what generated code would look like in their frontend repo;
- which OpenAPI gaps block stronger generation;
- how CI drift checks would work;
- what integration work remains for their design system.

## Scope

Recommended pilot length: 1-2 weeks.

Inputs:

- 1-3 OpenAPI 3.x schemas, or one tightly bounded schema family;
- one frontend repository or representative branch;
- the expected generated-output location;
- the current API layer conventions: client wrapper, query library, mocks, forms, tables and permissions;
- one representative API change for impact review;
- CI constraints, including whether merge blocking is allowed during the pilot.

Included:

- 1-3 private OpenAPI schemas or one tightly bounded schema family;
- local or CI-based Forge setup;
- generated clients, operation helpers, metadata and mocks;
- schema validation, lint/readiness and drift review;
- HTML and Markdown `check` reports;
- PR-ready `impact` report for one real or representative schema change;
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
- Markdown or HTML `impact` report with merge risk, migration hints and source usage scan.
- HTML or Markdown `check` report with pilot readiness status, blockers, warnings and next actions.
- JSON `check` payload for CI or internal automation.
- Generated TypeScript typecheck result and failure summary if any generated code does not compile.
- Diagnostics summary with recommended OpenAPI fixes.
- Resource coverage summary: CRUD, read-only, search, dashboard, action and file operations.
- Short integration guide for the customer's frontend.
- Go/no-go recommendation for broader rollout.
- Completed pilot report using [Pilot Report Template](/pilot-report-template).

The generated `pilot` folder should be reviewable without knowing Forge internals:

| File                           | Purpose                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `forge-pilot/pilot-report.md`  | Frontend-lead summary: decision, artifact links, impact summary, affected surface and next review step. |
| `forge-pilot/impact-pr.md`     | PR-ready comment with merge decision, risk, source usage and next actions.                              |
| `forge-pilot/impact.md`        | Detailed contract impact report.                                                                        |
| `forge-pilot/impact.json`      | Machine-readable impact payload for automation.                                                         |
| `forge-pilot/audit/index.html` | Browser-readable generated surface review.                                                              |
| `forge-pilot/audit/report.md`  | Markdown audit summary for internal notes.                                                              |
| `forge-pilot/check.html`       | Readiness report with blockers, warnings and next actions.                                              |
| `forge-pilot/go-no-go.md`      | Adoption decision record.                                                                               |

Recommended readiness commands:

```bash
archora-forge impact ./openapi.yaml --base origin/main --repo . --report markdown --report-file forge-impact.md --pr-comment-file forge-impact-pr.md
archora-forge pilot ./openapi.yaml --base origin/main --repo . --out forge-pilot
archora-forge audit ./openapi.yaml --out forge-audit
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

- `archora-forge impact` produces a readable PR artifact for a real contract change.
- `archora-forge check` can run in CI.
- The `check` readiness section has no unresolved blockers, or accepted blockers are documented in the final adoption report.
- Generated output is deterministic and reviewable.
- Generated TypeScript passes typecheck, or every compile failure is tied to a named generator or schema issue.
- The customer sees useful frontend metadata, not just client methods.
- Unsupported OpenAPI features are explicit and documented.
- The team has a clear path to adopt or reject Forge based on evidence.

## No-Go Criteria

Recommend no-go when:

- generated resources do not match the team's frontend mental model after reasonable config overrides;
- generated TypeScript cannot typecheck and the failure is not explainable as a bounded schema/generator issue;
- the schema relies on unsupported OpenAPI constructs that dominate the target surface;
- impact reports cannot identify useful generated surface or source usages for the team's workflow;
- the team needs generated production pages, routing, auth flows or hosted schema registry as the core value.

## Preview Boundaries

- The pilot covers a bounded schema or schema family, not unlimited OpenAPI support.
- Zod and Valibot output are opt-in validator-schema modes.
- First-party TanStack Query and Vue Query hooks are generated via `target.query`; other frameworks use a customer-owned wrapper.
- Forge does not generate Vue pages, routes or design-system components.
- Private pilot artifacts should stay private unless explicitly cleared for publication.
