# Schema-driven Tables

Tables are generated from list response and entity schemas. This gives each resource a useful first screen immediately after generation.

Current mappings:

- `string` -> text cell.
- `number` and `integer` -> number cell.
- `boolean` -> readable boolean badge.
- `enum` -> badge cell.
- `format: date` and `format: date-time` -> formatted date cell.
- nested objects and arrays -> safe JSON display.
- `writeOnly` fields are excluded from table output.

Tables include loading, empty and error states. When list responses look paginated, for example an object with `items`, `total` and `page`, Forge emits pagination metadata.

Explicit columns can be configured:

```ts
resources: {
  users: {
    table: {
      columns: ['email', 'status', 'verified', 'createdAt'],
      filters: ['status'],
    },
  },
}
```
