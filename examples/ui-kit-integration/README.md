# UI-kit Integration Example

This example shows how a consumer can map generated Archora Forge metadata into an internal UI kit without framework-specific generated components.

```ts
import { createUsersFormFields, createUsersTableColumns } from './src/users.ui-kit'

const columns = createUsersTableColumns()
const fields = createUsersFormFields()
```

The `src/generated/users.config.ts` file represents generated output. The `src/users.ui-kit.ts` file is consumer-owned integration code.
