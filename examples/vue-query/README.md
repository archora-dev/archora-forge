# Vue Query example

Generated output for a TanStack Query (Vue) consumer. The schema and config are the
only inputs; everything under `generated/` is produced by `archora-forge generate`.

## What drives it

`archora-forge.config.ts` selects the adapter:

```ts
export default defineForgeConfig({
  input: './openapi.yaml',
  target: { query: 'vue-query' },
})
```

`target.query` accepts `promise` (default), `tanstack-query` (React, see
`examples/react-query`) and `vue-query`. The core stays framework-neutral: hook
generation lives in `@archora/forge-adapters`, and the generated code imports
`@tanstack/vue-query` as a peer dependency of this project.

## What you get

For every resource the generator emits list / detail `useQuery` composables wired to
the generated query keys, plus create / update / delete `useMutation` composables that
invalidate the affected keys on success and forward any `options` you pass.

`src/usage.ts` consumes the composables and is type-checked by
`pnpm --filter vue-query-demo typecheck`.

## Regenerate

```bash
node ../../packages/cli/dist/index.js generate ./openapi.yaml
```
