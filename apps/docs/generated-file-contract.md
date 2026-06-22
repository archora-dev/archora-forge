# Generated File Contract

Archora Forge v1 generates framework-neutral TypeScript modules. The default layout is stable for v1.

## Default Layout

For a `users` resource, the default output is:

```text
src/features/users/api/index.ts
src/features/users/api/useCreateUserMutation.ts
src/features/users/api/useDeleteUserMutation.ts
src/features/users/api/useUpdateUserMutation.ts
src/features/users/api/useUserQuery.ts
src/features/users/api/useUsersQuery.ts
src/features/users/model/index.ts
src/features/users/model/users.config.ts
src/features/users/model/users.i18n.ts
src/features/users/model/users.permissions.ts
src/shared/api/generated/components.types.ts
src/shared/api/generated/users/index.ts
src/shared/api/generated/users/users.client.ts
src/shared/api/generated/users/users.query-keys.ts
src/shared/api/generated/users/users.types.ts
src/shared/mocks/users/index.ts
src/shared/mocks/users/users.fixtures.ts
src/shared/mocks/users/users.handlers.ts
src/shared/mocks/users/users.scenarios.ts
```

`components.types.ts` contains shared component schemas. Resource folders contain operation aliases, clients and query keys. Feature folders contain framework-neutral resource metadata and operation helper modules.

## Configurable Roots

The roots remain configurable:

```ts
import { defineForgeConfig } from '@archora/forge-cli'

export default defineForgeConfig({
  input: './openapi.yaml',
  output: {
    generatedDir: './src/shared/api/generated',
    featuresDir: './src/features',
    mocksDir: './src/shared/mocks',
  },
})
```

Changing output roots changes where files are written, but not the resource-level naming contract under each root.

## Protected Files

Generated files are safe to overwrite. Custom files are protected unless `overwrite.custom` or `--force` is used.

Use `archora-forge diff` or `archora-forge check --json` in CI before applying generated changes in a repository with local edits.

## Ownership Marker

Generated TypeScript files include:

```ts
// @archora-forge-generated
```

Forge uses this marker to identify stale files that may be pruned. `archora-forge generate --prune` deletes only marker-owned stale files under configured output roots. Unmarked files are never deleted by prune.

## Generator Metadata

Generated TypeScript files also include metadata:

```ts
// @archora-forge-meta {"version":"2.1.0","schemaHash":"...","configHash":"..."}
```

`schemaHash` identifies the normalized OpenAPI input used for generation. `configHash` identifies generation-relevant config such as output roots, resource overrides, target settings and validation mode.

`archora-forge check` reports generator metadata alignment. A mismatch means the generated output should be regenerated or reviewed before treating the report as an adoption artifact.

## Compatibility Policy

Within v1, Forge may add new generated files for new opt-in capabilities. Existing default file names, barrel locations and stable runtime imports should remain compatible.
