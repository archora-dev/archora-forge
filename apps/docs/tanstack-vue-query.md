# Experimental TanStack Vue Query Mode

Status: experimental opt-in. This mode is covered by generator tests and an isolated generated TypeScript typecheck with `@tanstack/vue-query` installed. It is not full app-level QueryClient integration.

Promise composables remain the default:

```ts
export default defineForgeConfig({
  input: './openapi.yaml',
  target: {
    query: 'promise',
  },
})
```

Opt in to experimental TanStack Vue Query wrappers:

```ts
export default defineForgeConfig({
  input: './openapi.yaml',
  target: {
    query: 'tanstack-vue-query',
  },
})
```

Generated query files import from `@tanstack/vue-query`. Install it in the consumer app when this mode is enabled:

```bash
pnpm add @tanstack/vue-query
```

The generated wrappers cover basic `useQuery`/`useMutation` calls and include query keys. They do not configure a `QueryClient`, router integration, cache invalidation policy or app-level error handling for you.
