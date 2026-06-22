# React Query example

Generated output for a TanStack Query (React) consumer. The schema and config are
the only inputs; everything under `generated/` is produced by `archora-forge generate`.

## What drives it

`archora-forge.config.ts` selects the adapter:

```ts
export default defineForgeConfig({
  input: './openapi.yaml',
  target: { query: 'tanstack-query' },
})
```

`target.query` accepts:

- `promise` (default) — framework-neutral helpers returning a `Promise`.
- `tanstack-query` — real `useQuery` / `useMutation` hooks for `@tanstack/react-query`.
- `vue-query` — the same for `@tanstack/vue-query` (see `examples/vue-query`).
- `svelte-query` — `createQuery` / `createMutation` runes for `@tanstack/svelte-query` (see `examples/svelte-query`).
- `angular-query` — `injectQuery` / `injectMutation` factories for `@tanstack/angular-query-experimental` (see `examples/angular-query`).

The core stays framework-neutral: hook generation lives in `@archora/forge-adapters`,
and the generated code imports `@tanstack/react-query` as a peer dependency of this
project — install it alongside the generated output.

## What you get

For every resource the generator emits:

- list / detail queries wired to the generated query keys
  (`useQuery({ queryKey: petsQueryKeys.list(params), queryFn: () => petsClient.listPets(params) })`);
- create / update / delete mutations that invalidate the affected keys on success
  and forward any `options` you pass (your `onSuccess` overrides the default
  invalidation when you need full control).

`src/usage.tsx` consumes the hooks inside a `QueryClientProvider` and is type-checked
by `pnpm --filter react-query-demo typecheck`.

## Regenerate

```bash
node ../../packages/cli/dist/index.js generate ./openapi.yaml
```
