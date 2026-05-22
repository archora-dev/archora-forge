# Private Schema Pilot Proof

This page records a redacted pilot run against a real production-style frontend API corpus. It is intended for internal sales qualification and paid pilot scoping. Do not publish customer schema names, endpoint names or generated private code without explicit approval.

## Corpus

- 37 OpenAPI schemas from one working frontend API corpus.
- 437 operations.
- 347 detected resources.
- 4,985 generated files across the generated output packages.
- Schemas stayed local during the run.

## Readiness Results

| Check | Result |
| --- | --- |
| Schema validation | 37/37 passed |
| Frontend lint/readiness check | 37/37 passed |
| Drift check | 37/37 passed |
| Diagnostics | 0 reported |
| Average health score | 97 |
| Generated TypeScript typecheck | 37/37 passed |

The generated TypeScript output was installed into a temporary workspace and checked with `tsc --noEmit`. This is stronger than a generation-only smoke test: it verifies that emitted clients, types, query keys, composables, metadata, mocks and labels are syntactically valid together.

## Detected Operation Mix

| Operation kind | Count |
| --- | ---: |
| CRUD resource | 201 |
| Dashboard resource | 72 |
| Action operation | 60 |
| Search resource | 47 |
| File operation | 47 |
| Read-only resource | 10 |

## What The Run Proved

- Forge can process a multi-schema private API corpus without uploading schemas to a hosted service.
- The current reports are useful for adoption review: validation, lint/readiness, drift, diagnostics and generated-output coverage all produce reviewable artifacts.
- The generated resource layer is not limited to simple CRUD. It also covers search, dashboards, file operations and action endpoints.
- Generated output can be typechecked as a customer-facing acceptance gate.

## Issues Found And Closed

The first generated TypeScript typecheck exposed four generator issues:

- mock fixture aliases collided with an entity named `Record`;
- i18n keys containing hyphens were emitted without quotes;
- fallback mutation request types used a raw entity name instead of the generated safe type name;
- composite delete helpers invalidated list query keys with invalid synthesized params.

These issues were fixed and covered by a product regression test. The same corpus then passed generated TypeScript typecheck on all 37 schemas.

## Sales Use

Use this proof as a qualification anchor, not as a blanket production-readiness claim. The right promise is:

> Forge has already survived a real 37-schema private API corpus, including generated TypeScript typecheck. A paid pilot should verify the same gates on the customer's own schema and produce a go/no-go adoption report.

Keep the offer bounded to 1-3 schemas or one tightly related schema family unless the customer pays for a broader migration assessment.
