# Type-safe Generation

Forge derives TypeScript types from OpenAPI schemas and reuses them across clients, query keys and operation helpers.

Generated clients use schema-derived request, response, path and query types. Entity models exclude response-only/write-only mismatches where possible, while create/update DTOs preserve request fields when the OpenAPI contract provides DTO schemas.
Pure dictionary schemas using `additionalProperties` are emitted as `Record<string, ...>` types, including nested map fields such as metadata or labels.
OpenAPI 3.1 nullable type arrays such as `type: ['string', 'null']` are emitted as nullable TypeScript unions.
Enum literals preserve primitive value types, so numeric and boolean enums are not converted into string literal types.
OpenAPI `const` values are emitted as literal TypeScript types.
Simple non-discriminated `oneOf` and `anyOf` branches are emitted as TypeScript unions; discriminator-based polymorphism is reported as a diagnostic.
