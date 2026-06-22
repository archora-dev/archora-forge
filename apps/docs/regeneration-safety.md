# Regeneration Safety

Forge is designed for generated output that can be committed and regenerated.

Generated files are plain TypeScript resource contracts. Use `diff`, `check` or `generate --dry-run` before writing files. Re-running `generate` skips identical files and reports them as `Unchanged` instead of rewriting them:

```bash
archora-forge diff ./openapi.yaml
archora-forge check ./openapi.yaml
archora-forge generate ./openapi.yaml --dry-run
```

## Generated Ownership

Forge writes a marker at the top of generated TypeScript files:

```ts
// @archora-forge-generated
// @archora-forge-meta {"version":"2.1.0","schemaHash":"...","configHash":"..."}
```

The ownership marker is used only for regeneration safety. Files without this marker are never deleted by Forge pruning.

The metadata marker is used by `archora-forge check` to report whether generated files match the current Forge version, schema and config. Files without metadata are reported as needing regeneration, but they are not deleted automatically.

## Stale Files

When a schema changes, a file that used to be generated can become stale. For example, removing a resource from the OpenAPI document can leave old files under `src/features`, `src/shared/api/generated` or `src/shared/mocks`.

Preview stale marker-owned files without deleting anything:

```bash
archora-forge generate ./openapi.yaml --dry-run --prune --json
```

Delete stale marker-owned files explicitly:

```bash
archora-forge generate ./openapi.yaml --prune
```

`--prune` only removes files that:

- are under configured generated output roots;
- contain the Forge ownership marker;
- are not part of the current generation plan.

User files and unmarked files are skipped.
