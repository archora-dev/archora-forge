# Remote Schema Loading

CLI commands accept local OpenAPI files and `http://`/`https://` schema URLs.

```bash
archora-forge inspect https://api.example.com/openapi.yaml
archora-forge validate https://api.example.com/openapi.json --strict
```

Headers can be configured without writing secrets into generated files:

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

Remote schemas are fetched on demand. There is no registry sync or persistent cache in the preview implementation.
