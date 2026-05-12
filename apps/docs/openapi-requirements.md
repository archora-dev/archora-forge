# OpenAPI Requirements

Archora Forge supports OpenAPI 3.x documents in JSON and YAML from local files and remote HTTP(S) URLs.

## Composition

OpenAPI support is intentionally conservative:

- simple `allOf` object branches are merged when all branches are object schemas or refs to object schemas and property constraints do not conflict;
- conflicting `allOf` branches emit `conflicting-allof`;
- simple non-discriminated `oneOf` and `anyOf` branches are emitted as broad unions;
- discriminator-driven polymorphism emits diagnostics and falls back to safe generated types rather than runtime narrowing behavior.

Do not claim full OpenAPI composition support yet.

## Binary, Text and Form Payloads

Forge v1 supports common non-JSON payload contracts:

- `multipart/form-data` request bodies are typed as `FormData`;
- `application/x-www-form-urlencoded` request bodies are typed as `URLSearchParams`;
- `application/octet-stream`, PDFs, images and wildcard binary responses are typed as `Blob` responses;
- binary request payloads are typed as `Blob | ArrayBuffer | ReadableStream`;
- `text/*` requests and responses are typed as `string`;
- 2xx responses with no `content` are typed as `void`.

If a binary or text endpoint still produces `unsupported-content-type`, check that the OpenAPI response or request body includes a schema. File payload schemas should use `type: string, format: binary`.
