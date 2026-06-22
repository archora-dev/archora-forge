# Svelte Query example

Generated output for a TanStack Query (Svelte) consumer. The schema and config are
the only inputs; everything under `generated/` is produced by `archora-forge generate`.

## What drives it

`archora-forge.config.ts` selects the adapter:

```ts
export default defineForgeConfig({
  input: './openapi.yaml',
  target: { query: 'svelte-query' },
})
```

The core stays framework-neutral: hook generation lives in `@archora/forge-adapters`,
and the generated code imports `@tanstack/svelte-query` as a peer dependency of this
project — install it alongside the generated output.

## What you get

For every resource the generator emits `createQuery` / `createMutation` runes wired to
the generated query keys and client:

```ts
export function usePetsQuery(params?: PetsListParams, options?: ...) {
  return createQuery({
    queryKey: petsQueryKeys.list(params),
    queryFn: () => petsClient.listPets(params),
    ...options,
  })
}
```

Mutations invalidate the affected keys on success and forward any `options` you pass.

`src/usage.ts` consumes the runes (results are read with `get(...)` since Svelte Query
returns stores) and is type-checked by `pnpm --filter svelte-query-demo typecheck`.

## Regenerate

```bash
node ../../packages/cli/dist/index.js generate ./openapi.yaml
```
