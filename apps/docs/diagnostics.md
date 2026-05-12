# Diagnostics

Diagnostics are designed to keep generation safe when an OpenAPI feature is unsupported or only partially supported.

Composition support in preview:

- simple `allOf` object branches can be merged when properties do not conflict;
- conflicting `allOf` branches emit `conflicting-allof`;
- `oneOf`, `anyOf` and `discriminator` emit diagnostics and are not modeled as polymorphic runtime behavior.

Each diagnostic includes:

- `code`;
- `severity`;
- `location`;
- `suggestion`.

Use strict validation in CI when the contract should fail on diagnostics:

```bash
archora-forge validate ./openapi.yaml --strict
archora-forge lint ./openapi.yaml --strict
```
