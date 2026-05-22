# Real-world Hardening

Forge should improve from real schema shapes without publishing private contracts.

## Fixture Sources

Use:

- public demo schemas;
- synthetic real-world fixtures;
- sanitized pilot patterns;
- reduced repro schemas;
- local-only private corpora that are never committed.

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

## Regression Rule

Every fixed schema pattern should become either:

- a committed neutral fixture;
- a unit test;
- a diagnostic with a clear suggestion;
- a documented limitation.

Private names, endpoint paths and business terms must be removed before a fixture is committed.
