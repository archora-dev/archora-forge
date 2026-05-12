# UI-kit Integration

Archora Forge does not generate framework components.

The generated `*.config.ts` files expose neutral form and table metadata that can be mapped into any application framework or internal design system.
Form adapters preserve schema defaults as `defaultValue` so consumers can seed create/edit forms without reading the OpenAPI document directly.

```ts
import { usersConfig } from './features/users/model/users.config'
import { toFilterFields, toFormFields, toTableColumns } from '@archora/forge-adapters'

export const columns = toTableColumns(usersConfig.columns)
export const fields = toFormFields(usersConfig.fields)
export const filters = toFilterFields(usersConfig.filters)
```

Adapters should live outside the core generator so teams can keep their own UI conventions.

The repository includes `examples/ui-kit-integration`, a small TypeScript example that maps generated metadata into fictional table, form and filter contracts owned by the consumer app.

## React

```tsx
import { toFormFields, toTableColumns } from '@archora/forge-adapters'

import { usersConfig } from './features/users/model/users.config'

const columns = toTableColumns(usersConfig.columns).map((column) => ({
  accessorKey: column.key,
  header: column.title,
  enableSorting: column.sortable,
}))

const fields = toFormFields(usersConfig.fields)

export function UsersScreen() {
  return <UsersTable columns={columns} formFields={fields} />
}
```

## Vue

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { toFormFields, toTableColumns } from '@archora/forge-adapters'

import { usersConfig } from './features/users/model/users.config'

const columns = computed(() =>
  toTableColumns(usersConfig.columns).map((column) => ({
    key: column.key,
    title: column.title,
    sortable: column.sortable,
  })),
)

const fields = computed(() => toFormFields(usersConfig.fields))
</script>

<template>
  <UsersTable :columns="columns" :fields="fields" />
</template>
```

## Svelte

```svelte
<script lang="ts">
  import { toFormFields, toTableColumns } from '@archora/forge-adapters'

  import { usersConfig } from './features/users/model/users.config'

  const columns = toTableColumns(usersConfig.columns).map((column) => ({
    id: column.key,
    label: column.title,
    sortable: column.sortable,
  }))

  const fields = toFormFields(usersConfig.fields)
</script>

<UsersTable {columns} {fields} />
```

## Angular

```ts
import { Component } from '@angular/core'
import { toFormFields, toTableColumns } from '@archora/forge-adapters'

import { usersConfig } from './features/users/model/users.config'

@Component({
  selector: 'app-users',
  template: '<app-users-table [columns]="columns" [fields]="fields" />',
})
export class UsersComponent {
  columns = toTableColumns(usersConfig.columns).map((column) => ({
    columnDef: column.key,
    header: column.title,
    sortable: column.sortable,
  }))

  fields = toFormFields(usersConfig.fields)
}
```
