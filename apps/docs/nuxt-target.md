# Experimental Nuxt Target Foundation

The config shape accepts a future Nuxt target:

```ts
export default defineForgeConfig({
  input: './openapi.yaml',
  target: {
    framework: 'nuxt',
  },
})
```

Current support is limited to documented configuration and future path conventions. The generator still emits the Vue module structure by default. Nuxt-specific composable paths, plugin setup and page conventions remain incomplete, so this should not be advertised as working Nuxt generation.
