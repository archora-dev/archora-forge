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
- relative URLs when `baseUrl` is an empty string
- query params with repeated keys for arrays
- OpenAPI `style: form` array query params with `explode: true` and `explode: false`
- JSON request bodies
- native fetch body values such as `FormData`, `URLSearchParams`, `Blob`, `ArrayBuffer`, typed arrays and `ReadableStream`
- JSON response parsing
- empty JSON responses as `undefined`
- text response fallback
- `204` responses
- non-2xx `ForgeHttpError`
- custom `fetchImpl`
- basic request, response and error hooks
- request timeouts with `timeoutMs`
- opt-in retry policy for transient safe-method failures
- bearer auth header preset
- API key auth header preset

This is a small generated-client runtime, not a full application transport framework. OAuth refresh, typed error envelope mapping and application-wide retry policy belong in the consuming app.

## Query Arrays

Plain arrays use repeated keys, matching OpenAPI `style: form, explode: true`:

```ts
await apiClient.request('GET', '/users', {
  params: { tag: ['active', 'trial'] },
})
```

For `style: form, explode: false`, generated clients wrap the value with `queryParam`:

```ts
import { queryParam } from '@archora/forge-runtime'

await apiClient.request('GET', '/users', {
  params: {
    tag: queryParam(['active', 'trial'], { style: 'form', explode: false }),
  },
})
```

## Retries

Retries are disabled by default. Enable them explicitly for transient failures:

```ts
createApiClient({
  baseUrl: 'https://api.example.com',
  retry: {
    attempts: 3,
    delayMs: 250,
  },
})
```

The default retry policy only retries `GET`, `HEAD` and `OPTIONS` for `408`, `429`, `500`, `502`, `503` and `504`.
Abort and timeout errors are not retried.
Mutating methods such as `POST`, `PUT`, `PATCH` and `DELETE` are not retried unless you explicitly include them in `retry.methods`.

```ts
createApiClient({
  baseUrl: 'https://api.example.com',
  retry: {
    attempts: 2,
    methods: ['GET', 'HEAD'],
    statuses: [408, 429, 503],
  },
})
```

## Timeouts

Set a default timeout on the runtime client:

```ts
createApiClient({
  baseUrl: 'https://api.example.com',
  timeoutMs: 10_000,
})
```

Override it for one request when needed:

```ts
await client.request('GET', '/slow-report', { timeoutMs: 30_000 })
```

## Tracing Hooks

Use hooks to connect generated clients to logs, metrics or tracing spans:

```ts
createApiClient({
  baseUrl: 'https://api.example.com',
  onRequest: ({ method, url }) => {
    console.info('api.request', { method, url })
  },
  onResponse: (response) => {
    console.info('api.response', { status: response.status })
  },
  onError: (error) => {
    console.error('api.error', error)
  },
})
```

`onError` receives both HTTP errors and network/runtime errors. Use `isForgeHttpError` when status or parsed body details are needed.

## Generated Clients

Generated resource clients expose configuration helpers so application code can wire transport settings once:

```ts
import { configureUsersClient } from './src/shared/api/generated/users/users.client'

configureUsersClient({
  baseUrl: 'https://api.example.com',
  auth: { type: 'bearer', token: async () => getToken() },
  retry: { attempts: 3 },
  timeoutMs: 10_000,
})
```

Generated methods accept per-call request options for transport concerns such as cancellation and longer timeouts:

```ts
await usersClient.listUsers({ page: 1 }, { signal: abortController.signal })
await usersClient.getUser('user-1', { timeoutMs: 30_000 })
```

Nested routes such as `/teams/{teamId}/users` and `/teams/{teamId}/users/{userId}` require parent path params in generated helpers and URL-encode them before sending requests.

Tests can replace the runtime client directly:

```ts
import { setUsersClient } from './src/shared/api/generated/users/users.client'

setUsersClient({
  request: async () => ({ items: [], total: 0 }),
})
```

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

Generated clients still do not embed secrets; pass auth through runtime configuration.

## Error Handling

```ts
import { isForgeHttpError } from '@archora/forge-runtime'

type ValidationError = {
  message: string
  fields?: Record<string, string[]>
}

try {
  await usersClient.listUsers()
} catch (error) {
  if (isForgeHttpError<ValidationError>(error)) {
    console.log(error.status, error.body.message)
  }
}
```
