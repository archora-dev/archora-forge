# Generated Output

Forge generates framework-neutral TypeScript resource contracts.

```txt
src/
  shared/
    api/generated/
      components.types.ts
      users/
        users.types.ts
        users.client.ts
        users.query-keys.ts
        index.ts
    mocks/users/
      users.fixtures.ts
      users.handlers.ts
      users.scenarios.ts
      index.ts
  features/users/
    api/
      useUsersQuery.ts
      useUserQuery.ts
      useCreateUserMutation.ts
      useUpdateUserMutation.ts
      useDeleteUserMutation.ts
      index.ts
    model/
      users.config.ts
      users.permissions.ts
      users.i18n.ts
      index.ts
```

`users.config.ts` contains table columns, filter fields, form fields and pagination metadata. Consumers map that metadata into their own UI kit.

`users.client.ts` contains typed API methods plus transport wiring helpers:

```ts
configureUsersClient({ baseUrl: 'https://api.example.com' })
setUsersClient(testClient)
usersClient.getUser('user-1', { timeoutMs: 30_000 })
```

Generated non-CRUD operation helpers include OpenAPI path, query and header parameters in their operation params type. Header parameters are forwarded through request `headers`, while CRUD resource header parameters can still be passed through the runtime options object.

Example:

```ts
export const usersConfig = {
  resource: 'users',
  pagination: {
    enabled: true,
    itemsPath: 'items',
    totalPath: 'total',
  },
  fields: [
    {
      name: 'email',
      label: 'Email',
      input: 'email',
      required: true,
      nullable: false,
      validation: {},
    },
    {
      name: 'status',
      label: 'Status',
      input: 'select',
      required: true,
      nullable: false,
      enumValues: ['active', 'invited', 'disabled'],
      defaultValue: 'invited',
      deprecated: true,
      validation: {},
    },
  ],
  filters: [
    { name: 'email', label: 'Email', input: 'email', component: 'ArchInput', required: false, nullable: false, validation: {} },
    {
      name: 'status',
      label: 'Status',
      input: 'select',
      component: 'ArchSelect',
      required: false,
      nullable: false,
      enumValues: ['active', 'invited', 'disabled'],
      validation: {},
    },
  ],
  columns: [
    { name: 'email', label: 'Email', cell: 'text', sortable: true, nullable: false },
    { name: 'status', label: 'Status', cell: 'badge', sortable: true, nullable: false },
  ],
} as const
```
