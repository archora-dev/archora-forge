# Troubleshooting

## `unsupported-content-type`

Add a schema to the OpenAPI `requestBody` or 2xx response content entry.

Supported v1 payloads include JSON, `multipart/form-data`, `application/x-www-form-urlencoded`, `text/*`, common binary responses and `type: string, format: binary` file schemas.

## `missing-response-schema`

Add a 2xx response schema when the endpoint returns a body. If the endpoint intentionally returns no body, model the 2xx response without `content`; Forge will type it as `void`.

## `unsupported-security-schemes`

Forge v1 recognizes bearer auth, OAuth2 bearer-token runtime configuration and header API keys. Cookie API keys and custom security flows should be passed through `headers` or `getHeaders` until first-class support is added.

## `conflicting-allof`

Two `allOf` branches define the same property with incompatible constraints. Resolve the conflict in the OpenAPI schema or replace the composed schema with an explicit object for generated clients.

## `unsupported-oneof` or `unsupported-anyof`

Simple non-discriminated primitive unions are generated as TypeScript unions. Complex polymorphic branches remain diagnostic-only. The diagnostic impact includes branch locations such as `#/components/schemas/Result/oneOf/0`.

## Generated Files Drift In CI

Run:

```bash
pnpm exec archora-forge diff --json
pnpm exec archora-forge generate
```

Commit the generated changes. Use `check --report markdown --report-file forge-check.md` to keep a reviewable CI artifact.

## Remote Schema Fails To Load

Check:

- URL is reachable from CI;
- `OPENAPI_TOKEN` or API key secret is present;
- `schemaRequest.timeoutMs` is high enough;
- repeated `--schema-header` values use `name:value` or `name=value`.
