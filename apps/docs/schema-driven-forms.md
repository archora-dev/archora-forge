# Schema-driven Forms

Forms are generated from schema properties and resource config, so the UI starts from the API contract instead of hand-written field lists.

Current mappings:

- `string` -> text input.
- `format: email` -> email input.
- `number` and `integer` -> number input.
- `boolean` -> switch.
- `enum` -> select.
- `format: date` and `format: date-time` -> date/date-time control.
- `readOnly` fields are excluded from create/edit forms.
- `required`, `minLength`, `maxLength`, `minimum` and `maximum` become validation metadata.
- `description` becomes field hint text.

Explicit resource config can limit or order generated fields:

```ts
resources: {
  users: {
    form: {
      fields: ['email', 'password', 'status', 'verified'],
    },
  },
}
```

Generated components import from `src/shared/ui/archora-ui.ts`, which can remain as the fallback adapter or be replaced with real `@archora/ui` exports.
