# Schema-driven Tables

Forge generates table metadata, not table components.

Columns are derived from response schema metadata:

- enum fields become badge-like cell metadata;
- `date` and `date-time` formats are preserved;
- boolean, number, object and array fields get stable cell kinds;
- deprecated schema fields are exposed as `deprecated`;
- paginated list responses become pagination metadata.

Consumers map `columns` from `<resource>.config.ts` into their UI kit.

When `resources.<name>.table.filters` is configured, Forge also emits `filters` in `<resource>.config.ts` using the same field metadata shape as forms, so consumers can pass it through `toFilterFields()`.
