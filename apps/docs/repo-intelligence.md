# Repo Intelligence

Repo intelligence connects contract changes to application source usage.

`impact --repo` scans source files for the generated API surface affected by a schema change:

```bash
pnpm exec archora-forge impact ./openapi.old.yaml ./openapi.yaml --repo .
```

The report includes:

- source file path;
- matched generated API tokens;
- line numbers;
- PR-comment-ready summary.

## Current Scope

The scanner looks for:

- operation IDs;
- client method names;
- query hook names;
- generated resource helpers such as `contactsClient`, `contactsQueryKeys`, `contactsConfig` and `contactsPermissions`.

It skips common generated and build folders.

## Why This Matters

Contract diffs alone tell a team what changed. Repo intelligence tells them where the frontend already depends on it.

That makes the impact report useful before regeneration, before merge and before release.
