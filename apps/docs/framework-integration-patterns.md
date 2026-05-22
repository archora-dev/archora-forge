# Framework Integration Patterns

Forge generates framework-neutral TypeScript. The consuming application owns routing, state, auth policy, UI components and workflow behavior.

## Vue With TanStack Query

Generated clients expose Promise-returning methods and query keys. Wrap them in application-owned composables:

```ts
import { useQuery } from '@tanstack/vue-query'

import { usersClient } from '../shared/api/generated/users/users.client'
import { usersQueryKeys } from '../shared/api/generated/users/users.query-keys'

export function useUsersList(params: { page?: number }) {
  return useQuery({
    queryKey: usersQueryKeys.list(params),
    queryFn: () => usersClient.listUsers(params),
  })
}
```

Keep cache invalidation and optimistic updates in the application layer. Forge should not decide product-specific mutation behavior.

## Client Services

Wrap generated clients when application code needs a stable domain API:

```ts
import { usersClient } from '../shared/api/generated/users/users.client'

export async function inviteUser(input: { email: string }) {
  const user = await usersClient.createUser({ email: input.email, status: 'invited' })
  return { id: user.id, email: user.email }
}
```

This wrapper is the right place for business defaults, analytics and product-specific error mapping.

## Metadata To Tables And Forms

Generated `*.config.ts` files contain neutral metadata. Adapt it to the local UI kit:

```ts
import { toFormFields, toTableColumns } from '@archora/forge-adapters'

import { usersConfig } from '../features/users/model/users.config'

export const userTableColumns = toTableColumns(usersConfig.columns).map((column) => ({
  id: column.key,
  header: column.title,
  sortable: column.sortable,
}))

export const userFormFields = toFormFields(usersConfig.fields)
```

The adapter output should be reviewed like application code. Do not force the UI kit to mirror Forge metadata names.

## Boundary Checklist

- Generated clients belong under the generated API output directory.
- Query wrappers and mutation policy belong in the consuming app.
- Auth token retrieval belongs in runtime configuration.
- Route definitions belong in the application router.
- Table, form and filter components belong in the application UI kit.
- Generated files should be committed and reviewed, but not hand-edited.
