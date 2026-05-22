# Config Presets

Use `createForgeConfigPreset()` when a repository follows one of the common layouts.

```ts
import { createForgeConfigPreset, defineForgeConfig } from '@archora/forge-cli'

export default defineForgeConfig(
  createForgeConfigPreset('feature-sliced', {
    input: './openapi.yaml',
  }),
)
```

## Feature-Sliced

```ts
createForgeConfigPreset('feature-sliced', {
  input: './openapi.yaml',
})
```

Generated defaults:

- `./src/shared/api/generated`
- `./src/features`
- `./src/shared/mocks`

## Simple

```ts
createForgeConfigPreset('simple', {
  input: './openapi.yaml',
})
```

Generated defaults:

- `./src/api/generated`
- `./src/api/features`
- `./src/api/mocks`

## Monorepo

```ts
createForgeConfigPreset('monorepo', {
  inputs: [
    { name: 'users', path: './contracts/users.yaml' },
    { name: 'billing', path: './contracts/billing.yaml' },
  ],
})
```

Generated defaults:

- `./src/generated/users`
- `./src/generated/billing`

Explicit config values always override preset defaults.
