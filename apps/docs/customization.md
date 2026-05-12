# Customizable Output

Archora Forge keeps framework components out of core output. Customization focuses on generated TypeScript contracts and metadata.

```ts
import { defineForgeConfig } from '@archora/forge-config'

export default defineForgeConfig({
  input: './openapi.yaml',
  target: {
    framework: 'neutral',
    ui: 'metadata',
    architecture: 'feature-sliced',
  },
  resources: {
    users: {
      entity: 'Account',
      table: { columns: ['email', 'status', 'createdAt'] },
      form: { fields: ['email', 'status'] },
      permissions: {
        view: 'iam.users.read',
        create: 'iam.users.create',
      },
    },
  },
})
```

`entity` controls generated helper names such as `useAccountsQuery`, `useCreateAccountMutation` and `configureAccountsClient` while keeping the output folder/resource key as `users`.

Use the generated `*.config.ts` metadata as the stable integration point for your UI kit.
