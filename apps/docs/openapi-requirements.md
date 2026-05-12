# OpenAPI Requirements

Archora Forge supports OpenAPI 3.x documents in JSON and YAML from local files and remote HTTP(S) URLs.

## Composition

Preview support is intentionally conservative:

- simple `allOf` object branches are merged when all branches are object schemas or refs to object schemas and property constraints do not conflict;
- conflicting `allOf` branches emit `conflicting-allof`;
- `oneOf`, `anyOf` and `discriminator` emit diagnostics and fall back to safe generated types rather than polymorphic runtime behavior.

Do not claim full OpenAPI composition support yet.
