# Archora Forge Paid Private Beta Pilot

Archora Forge is a local-first OpenAPI to frontend resource-layer generator for Vue and TypeScript teams. The paid private beta pilot is an implementation and risk-reduction package, not CLI usage billing and not a production-ready guarantee.

## For Whom

- Frontend, platform or design-system teams with OpenAPI-backed Vue applications.
- Teams that already have typed clients but still hand-write resource modules, query keys, table/form metadata, permissions, labels and mocks.
- Teams that cannot upload private schemas to hosted vendor tools.
- Teams that want CI drift/readiness checks before adopting generated code broadly.

## Pain It Solves

OpenAPI generators usually provide a client. Frontend teams still need to connect the API contract to application resources: list/detail/create/update/delete operations, search and dashboard endpoints, action operations, file operations, mocks, labels, permissions and generated-output drift checks.

Forge helps evaluate whether that resource layer can be generated consistently from the customer's real schema while keeping the schema local.

## What Is Included

- One bounded private OpenAPI schema or schema family.
- Local Forge setup in a temporary workspace or customer-controlled repo.
- Schema inspect, lint and readiness review.
- Generated TypeScript clients, types, query keys and operation helpers.
- Generated form/table metadata, permissions, i18n labels and mocks where supported.
- HTML readiness/drift report suitable for internal review.
- Diagnostics triage and schema improvement recommendations.
- A short integration recommendation for the customer's Vue stack.
- Final adoption summary with go/no-go risks.

## Customer Receives

- A private generated-output review package or customer-owned branch/patch.
- A redacted diagnostics summary.
- A CI check recommendation for schema drift/readiness.
- A list of schema patterns that work well and patterns that need attention.
- A practical integration path for their frontend architecture.

## Not Included

- Production-ready rollout.
- Generated Vue pages, routes or complete application screens.
- Full design-system implementation.
- Backend OpenAPI redesign.
- Unlimited schema families or multi-month migration work.
- A guarantee of complete OpenAPI feature coverage.

## Preview Limitations

- Forge is in public preview/private beta.
- Private schema results depend on schema quality and API conventions.
- Vue/TanStack integration is a guided pattern today, not a universal first-party adapter.
- Zod and Valibot generation are experimental opt-in modes.
- Discriminator-heavy polymorphism, unusual serialization and unsupported transports may require manual handling.
- Generated private artifacts should stay private unless explicitly cleared by the customer.

## Example Timeline

Day 1: intake, privacy rules, temporary workspace and first inspect/lint run.

Days 2-3: generation pass, diagnostics triage and schema readiness review.

Days 4-5: frontend integration review for clients, helpers, metadata, permissions, labels and mocks.

Days 6-7: CI check/report recommendation, redacted findings and go/no-go summary.

Larger or enterprise schemas may need a longer pilot. The timeline is a planning example, not a production-readiness promise.

## Pricing Suggestion

Position pricing as an implementation and risk-reduction package:

- Small bounded pilot: USD 2k-5k.
- Larger enterprise schema pilot: USD 8k-15k.
- Follow-up implementation or support: scoped separately.

The price should reflect schema complexity, security constraints, required integration depth and the amount of diagnostics triage needed.
