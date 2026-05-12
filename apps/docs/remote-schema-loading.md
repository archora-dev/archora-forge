# Remote Schema Loading

CLI commands accept local OpenAPI files and `http://`/`https://` schema URLs.

```bash
archora-forge inspect https://api.example.com/openapi.yaml
archora-forge validate https://api.example.com/openapi.json --strict
```

For one-off CLI runs, pass request headers directly:

```bash
archora-forge inspect https://api.example.com/openapi.yaml --schema-header "authorization: Bearer $OPENAPI_TOKEN"
archora-forge generate https://api.example.com/openapi.yaml --dry-run --schema-header "x-api-key=$OPENAPI_KEY"
```

Repeat `--schema-header` to send multiple headers. Values can use either `name:value` or `name=value` syntax.

Headers can also be configured without writing secrets into generated files:

```ts
import { defineForgeConfig } from '@archora/forge-config'

export default defineForgeConfig({
  input: 'https://api.example.com/openapi.yaml',
  schemaRequest: {
    headers: {
      authorization: 'Bearer ${OPENAPI_TOKEN}',
    },
    timeoutMs: 30000,
  },
})
```

Environment placeholders are resolved at config load time. Keep tokens in CI or local environment variables and avoid committing them.

Remote schemas are fetched on demand. Timeout failures include the configured duration in CLI error output. Forge does not run registry sync or persistent schema caching.
