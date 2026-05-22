# Release Discipline

Use this checklist before publishing or tagging a public release.

## Required Checks

```bash
pnpm release:check
```

`release:check` runs tests, lint, typecheck, package verification and the external consumer smoke test.

## Package Verification

Before publishing:

1. Run `pnpm pack:check`.
2. Confirm package contents include built CLI/runtime/core files and generated type declarations.
3. Confirm package contents do not include local temp output, private schemas or demo `node_modules`.
4. Run the external consumer smoke from a packed tarball.

## Upgrade Notes

Every release with generated-output impact should document:

- generated file path changes;
- metadata marker changes;
- client method signature changes;
- query key changes;
- config option changes;
- runtime behavior changes;
- validation artifact changes;
- required regeneration steps.

Use `docs/releases/vX.Y.Z.md` for release notes.

## Generated-File Contract

If generated file structure changes:

1. Update `apps/docs/generated-file-contract.md`.
2. Add or update regression tests that assert expected file paths.
3. Mention whether consumers must regenerate all files.
4. Mention whether stale Forge-owned files can be removed with `generate --prune`.

## Compatibility Expectations

For the v1 layout:

- generated output remains TypeScript and framework-neutral;
- generated files keep Forge ownership and metadata headers;
- application-owned wrappers remain outside generated directories;
- CLI JSON top-level fields stay stable unless release notes call out a breaking change;
- private schemas are handled locally and are not uploaded by Forge.
