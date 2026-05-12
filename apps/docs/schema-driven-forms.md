# Schema-driven Forms

Forge generates form metadata, not form components.

Fields are derived from schema metadata:

- required fields become required field metadata;
- enum fields become select options;
- `format: email`, `uri`, `date` and `date-time` map to input kinds;
- schema `default` values are exposed as `defaultValue`;
- deprecated schema fields are exposed as `deprecated`;
- nullable, read-only and write-only fields influence generated create/edit metadata.

Consumers map `fields` from `<resource>.config.ts` into their UI kit.
