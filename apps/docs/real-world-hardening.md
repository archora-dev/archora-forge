# Real-world Hardening

Forge should improve from real schema shapes without publishing private contracts.

## Fixture Sources

Use:

- public demo schemas;
- synthetic real-world fixtures;
- sanitized pilot patterns;
- reduced repro schemas;
- local-only private corpora that are never committed.

Committed hardening fixtures live in:

- `test/fixtures/openapi/real-world/` for clean production-style CRUD/search/action patterns;
- `test/fixtures/openapi/ugly/` for intentionally awkward contracts that must still parse, report diagnostics and produce partial useful output.

## What to Harden

Prioritize:

- large schema parse and normalize time;
- duplicate or unstable operation IDs;
- nested path params;
- search and action endpoints;
- binary upload and download;
- `allOf`, `oneOf`, `anyOf` and discriminator-heavy schemas;
- missing request or response schemas;
- remote schema loading with headers and timeouts;
- generated-output typecheck failures.

The ugly fixture suite currently covers:

- discriminator-heavy `oneOf` and mixed `allOf` schemas;
- unsupported cookie API key auth and operation-level security;
- binary upload/download and unsupported request content types;
- nullable fields and `type: [string, "null"]`;
- unsafe schema names, operation IDs, path params and reserved property names;
- header parameters that should be reported instead of silently ignored.

## Regression Rule

Every fixed schema pattern should become either:

- a committed neutral fixture;
- a unit test;
- a diagnostic with a clear suggestion;
- a documented limitation.

Private names, endpoint paths and business terms must be removed before a fixture is committed.

## Quality Bar

An imperfect schema should not become an all-or-nothing failure when Forge can still produce useful review artifacts. The expected behavior is:

- parse the schema or fail with a precise loading error;
- generate safe TypeScript for supported operations;
- mark unsupported or risky shapes as diagnostics;
- keep coverage counts visible in check/audit reports;
- avoid generating application UI or fake CRUD behavior for file/action endpoints.
