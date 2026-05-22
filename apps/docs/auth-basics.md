# Auth Basics

Runtime auth is header-based and explicit. Generated clients do not hardcode secrets.

```ts
import { createApiClient } from '@archora/forge-runtime'

const bearerClient = createApiClient({
  baseUrl: 'https://api.example.com',
  auth: {
    type: 'bearer',
    token: () => localStorage.getItem('token') ?? '',
  },
})

const apiKeyClient = createApiClient({
  baseUrl: 'https://api.example.com',
  auth: {
    type: 'apiKey',
    headerName: 'x-api-key',
    value: () => import.meta.env.VITE_API_KEY,
  },
})
```

Static `headers`, auth headers, `getHeaders()` and per-request headers are merged in that order. Per-request headers can still override earlier values.

## Header Policies

Bearer token:

```ts
createApiClient({
  baseUrl: 'https://api.example.com',
  auth: { type: 'bearer', token: () => getAccessToken() },
})
```

API key:

```ts
createApiClient({
  baseUrl: 'https://api.example.com',
  auth: { type: 'apiKey', headerName: 'x-api-key', value: () => getApiKey() },
})
```

Tenant or tracing headers:

```ts
createApiClient({
  baseUrl: 'https://api.example.com',
  getHeaders: () => ({
    'x-tenant-id': getTenantId(),
    'x-request-id': crypto.randomUUID(),
  }),
})
```

Unsupported:

- OAuth refresh flows;
- token storage;
- cookie/session orchestration;
- enterprise auth policy.
