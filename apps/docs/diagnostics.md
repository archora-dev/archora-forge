# Diagnostics

Diagnostics are designed to keep generation safe when an OpenAPI feature is unsupported or only partially supported.

Composition support:

- simple `allOf` object branches can be merged when properties do not conflict;
- conflicting `allOf` branches emit `conflicting-allof`;
- simple non-discriminated `oneOf` and `anyOf` branches are emitted as broad unions;
- discriminator-driven polymorphism emits diagnostics and is not modeled as runtime narrowing behavior.

Each diagnostic includes:

- `code`;
- `severity`;
- `location`;
- `suggestion`.

## Binary Payloads

Binary upload and download operations should not produce diagnostics when the contract declares a supported content type and schema:

- uploads: `multipart/form-data` or `application/octet-stream`;
- downloads: `application/octet-stream`, `application/pdf`, `image/*` or `*/*` with `type: string, format: binary`;
- generated request types: `FormData`, `Blob | ArrayBuffer | ReadableStream` or `URLSearchParams`;
- generated response types: `Blob`.

If Forge reports `unsupported-content-type`, add a schema to the OpenAPI `requestBody` or 2xx response content entry. For file payloads, prefer `type: string, format: binary`.

Use strict validation in CI when the contract should fail on diagnostics:

```bash
archora-forge validate ./openapi.yaml --strict
archora-forge lint ./openapi.yaml --strict
```
