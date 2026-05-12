# Generated Output

OpenAPI generators give you a client. Archora Forge gives you the frontend module around that client.

![Generated Users module preview](/screenshots/forge-demo-users.png)

## Before and After

```txt
Before
  openapi.yaml

After
  shared/api/generated/
  features/users/
  features/orders/
  features/reports/
  pages/users/
  pages/orders/
  pages/reports/
```

For a `users` resource, Forge creates:

```txt
src/
  shared/
    api/generated/users/
      users.types.ts
      users.client.ts
      users.query-keys.ts
      index.ts
    mocks/users/
      users.fixtures.ts
      users.handlers.ts
      users.scenarios.ts
      index.ts
    ui/
      archora-ui.ts
  features/users/
    api/
      useUsersQuery.ts
      useUserQuery.ts
      useCreateUserMutation.ts
      useUpdateUserMutation.ts
      useDeleteUserMutation.ts
    model/
      users.config.ts
      users.i18n.ts
      users.permissions.ts
    ui/
      UsersTable.generated.vue
      UsersTable.vue
      UserForm.generated.vue
      UserDrawer.generated.vue
      DeleteUserConfirm.generated.vue
  pages/users/
    UsersPage.generated.vue
    users.routes.ts
    index.ts
```

The output includes types, client methods, query keys, composables, forms, tables, pages, routes, permissions, i18n and mocks. Generated files can be regenerated; custom wrapper files stay protected by default.
