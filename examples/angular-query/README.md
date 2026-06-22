# Angular Query example

Generated output for a TanStack Query (Angular) consumer. The schema and config are
the only inputs; everything under `generated/` is produced by `archora-forge generate`.

## What drives it

`archora-forge.config.ts` selects the adapter:

```ts
export default defineForgeConfig({
  input: './openapi.yaml',
  target: { query: 'angular-query' },
})
```

The core stays framework-neutral: hook generation lives in `@archora/forge-adapters`,
and the generated code imports `@tanstack/angular-query-experimental` as a peer
dependency of this project — install it alongside the generated output.

## What you get

For every resource the generator emits `injectQuery` / `injectMutation` factories. Angular
passes options through a factory function, so the generated code wraps the options object:

```ts
export function usePetsQuery(params?: PetsListParams, options?: ...) {
  return injectQuery(() => ({
    queryKey: petsQueryKeys.list(params),
    queryFn: () => petsClient.listPets(params),
    ...options,
  }))
}
```

The injectors must run in an injection context, so they are bound as component fields.
`src/usage.ts` consumes them inside a component and is type-checked by
`pnpm --filter angular-query-demo typecheck`.

## Regenerate

```bash
node ../../packages/cli/dist/index.js generate ./openapi.yaml
```
