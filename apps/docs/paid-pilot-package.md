# Paid Pilot Package

This package is a practical first commercial offer for teams evaluating Archora Forge on a real schema.

Position the offer as a paid private beta/pilot. Do not sell it as a production-ready platform license.

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

- one private OpenAPI schema or one bounded schema family;
- local or CI-based Forge setup;
- generated clients, operation helpers, metadata and mocks;
- HTML schema/report review;
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
- Diagnostics summary with recommended OpenAPI fixes.
- Short integration guide for the customer's frontend.
- Go/no-go recommendation for broader rollout.

Recommended readiness commands:

```bash
archora-forge check ./openapi.yaml --report html --report-file forge-check.html
archora-forge check ./openapi.yaml --report markdown --report-file forge-check.md
archora-forge check ./openapi.yaml --json
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
- The customer sees useful frontend metadata, not just client methods.
- Unsupported OpenAPI features are explicit and documented.
- The team has a clear path to adopt or reject Forge based on evidence.

## Preview Boundaries

- The pilot covers a bounded schema or schema family, not unlimited OpenAPI support.
- Zod and Valibot output are experimental opt-in modes.
- TanStack-style usage requires a customer-owned wrapper today.
- Forge does not generate Vue pages, routes or design-system components.
- Private pilot artifacts should stay private unless explicitly cleared for publication.
