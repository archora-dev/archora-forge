# Framework Consumer Examples

Forge output is framework-neutral. The consuming app decides how to bind generated clients, query keys, metadata and permissions to its stack.

## React and TanStack Query

```ts
import { useQuery } from '@tanstack/react-query'
import { contactsClient, contactsQueryKeys } from './generated/shared/api/generated/contacts'

export function useContacts() {
  return useQuery({
    queryKey: contactsQueryKeys.list(),
    queryFn: () => contactsClient.listContacts(),
  })
}
```

## Vue

```ts
import { ref } from 'vue'
import { contactsClient } from './generated/shared/api/generated/contacts'

export function useContacts() {
  const data = ref(null)
  const load = async () => {
    data.value = await contactsClient.listContacts()
  }
  return { data, load }
}
```

## Plain TypeScript Service

```ts
import { contactsClient } from './generated/shared/api/generated/contacts'

export const contactsService = {
  list: () => contactsClient.listContacts(),
  create: (payload: unknown) => contactsClient.createContact(payload),
}
```

## UI Kit Metadata

Generated resource config can be mapped into internal table and form contracts:

```ts
import { contactsConfig } from './generated/features/contacts/model'

export const contactsTable = {
  columns: contactsConfig.table.columns,
  filters: contactsConfig.filters,
}
```

Forge stops at the resource contract. Components, routing, screen state and design-system bindings stay application-owned.
