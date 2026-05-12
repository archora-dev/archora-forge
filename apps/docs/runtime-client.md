# Runtime Client

Archora Forge now includes a minimal fetch-based runtime:

```ts
import { createApiClient } from '@archora/forge-runtime'

const apiClient = createApiClient({
  baseUrl: 'https://api.example.com',
  headers: { accept: 'application/json' },
})
```

Supported today:

- `baseUrl`
- query params with repeated keys for arrays
- JSON request bodies
- JSON response parsing
- text response fallback
- `204` responses
- non-2xx `ForgeHttpError`
- custom `fetchImpl`
- basic request, response and error hooks
- bearer auth header preset
- API key auth header preset

This is not a production transport framework. OAuth refresh, retries, typed error envelope mapping, multipart/file uploads and full security scheme integration are roadmap items.

## Auth Presets

```ts
createApiClient({
  baseUrl: 'https://api.example.com',
  auth: { type: 'bearer', token: async () => getToken() },
})

createApiClient({
  baseUrl: 'https://api.example.com',
  auth: { type: 'apiKey', headerName: 'x-api-key', value: () => getApiKey() },
})
```

Generated clients still use an `apiClient` instance and do not embed secrets.
