# Package and Release Readiness

Before publishing, run:

```bash
pnpm release:check
```

This runs:

- tests;
- lint;
- typecheck;
- package verification;
- external consumer smoke.

## Package Check

```bash
pnpm pack:check
```

The package check verifies that the packed CLI can be installed into a temporary consumer project and that the installed binary can generate files.

## Release Notes

Every release that affects generated output should mention:

- generated file layout changes;
- CLI JSON field additions;
- new diagnostics;
- new supported OpenAPI shapes;
- migration notes;
- known limitations.

## Publish Gate

Do not publish when:

- `pnpm release:check` fails;
- docs build fails;
- public demo reports contain private paths or names;
- generated-output typecheck is failing without a documented reason;
- package contents include local temporary artifacts.
