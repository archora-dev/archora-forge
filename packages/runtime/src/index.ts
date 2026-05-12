export type ApiClientOptions = {
  baseUrl: string
  headers?: Record<string, string>
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>
  auth?: ApiAuthOptions
  fetchImpl?: typeof fetch
  onRequest?: (request: { method: string; url: string; options?: ApiRequestOptions }) => void | Promise<void>
  onResponse?: (response: Response) => void | Promise<void>
  onError?: (error: unknown) => void | Promise<void>
}

export type ApiAuthValue = string | (() => string | Promise<string>)

export type ApiAuthOptions =
  | {
      type: 'bearer'
      token: ApiAuthValue
    }
  | {
      type: 'apiKey'
      headerName: string
      value: ApiAuthValue
    }

export type ApiRequestOptions = {
  params?: Record<string, unknown>
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
}

export type ApiClient = {
  request: <TResponse>(method: string, path: string, options?: ApiRequestOptions) => Promise<TResponse>
}

export class ForgeHttpError extends Error {
  readonly status: number
  readonly statusText: string
  readonly body: unknown
  readonly method: string
  readonly url: string

  constructor(input: { status: number; statusText: string; body: unknown; method: string; url: string }) {
    super(`${input.method} ${input.url} failed with ${input.status} ${input.statusText}`.trim())
    this.name = 'ForgeHttpError'
    this.status = input.status
    this.statusText = input.statusText
    this.body = input.body
    this.method = input.method
    this.url = input.url
  }
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  return {
    async request<TResponse>(method: string, path: string, requestOptions: ApiRequestOptions = {}) {
      const fetchImpl = options.fetchImpl ?? fetch
      const url = buildUrl(options.baseUrl, path, requestOptions.params)
      const headers = await buildHeaders(options, requestOptions)
      const init: RequestInit = {
        method,
        headers,
        signal: requestOptions.signal,
      }

      if (requestOptions.body !== undefined && method.toUpperCase() !== 'GET') {
        init.body = typeof requestOptions.body === 'string' || requestOptions.body instanceof FormData ? requestOptions.body : JSON.stringify(requestOptions.body)
        if (!(requestOptions.body instanceof FormData) && !hasHeader(headers, 'content-type')) {
          headers['content-type'] = 'application/json'
        }
      }

      await options.onRequest?.({ method, url, options: requestOptions })

      try {
        const response = await fetchImpl(url, init)
        await options.onResponse?.(response)
        const body = await parseResponseBody(response)
        if (!response.ok) {
          throw new ForgeHttpError({ status: response.status, statusText: response.statusText, body, method, url })
        }

        return body as TResponse
      } catch (error) {
        await options.onError?.(error)
        throw error
      }
    },
  }
}

export function createApiClientOptions(options: ApiClientOptions): ApiClient {
  return createApiClient(options)
}

function buildUrl(baseUrl: string, path: string, params?: Record<string, unknown>): string {
  const url = new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`)
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null) url.searchParams.append(key, String(item))
      }
      continue
    }
    url.searchParams.append(key, String(value))
  }

  return url.toString()
}

async function buildHeaders(options: ApiClientOptions, requestOptions: ApiRequestOptions): Promise<Record<string, string>> {
  return {
    ...(options.headers ?? {}),
    ...(await buildAuthHeaders(options.auth)),
    ...((await options.getHeaders?.()) ?? {}),
    ...(requestOptions.headers ?? {}),
  }
}

async function buildAuthHeaders(auth: ApiAuthOptions | undefined): Promise<Record<string, string>> {
  if (!auth) return {}
  if (auth.type === 'bearer') {
    const token = await resolveAuthValue(auth.token)
    return token ? { authorization: `Bearer ${token}` } : {}
  }

  const value = await resolveAuthValue(auth.value)
  return value ? { [auth.headerName]: value } : {}
}

async function resolveAuthValue(value: ApiAuthValue): Promise<string> {
  return typeof value === 'function' ? value() : value
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return response.json()
  }

  return response.text()
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  return Object.keys(headers).some((key) => key.toLowerCase() === name.toLowerCase())
}
