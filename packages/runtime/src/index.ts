export type ApiClientOptions = {
  baseUrl: string
  headers?: Record<string, string>
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>
  auth?: ApiAuthOptions
  fetchImpl?: typeof fetch
  timeoutMs?: number
  retry?: ApiRetryOptions
  onRequest?: (request: { method: string; url: string; options?: ApiRequestOptions }) => void | Promise<void>
  onResponse?: (response: Response) => void | Promise<void>
  onError?: (error: unknown) => void | Promise<void>
}

export type ApiRetryOptions = {
  attempts?: number
  delayMs?: number
  methods?: string[]
  statuses?: number[]
}

export type ApiQueryParamOptions = {
  style?: 'form'
  explode?: boolean
}

export type ApiQueryParam = ApiQueryParamOptions & {
  value: unknown
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
  params?: Record<string, unknown | ApiQueryParam>
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
  timeoutMs?: number
}

export type ApiClient = {
  request: <TResponse>(method: string, path: string, options?: ApiRequestOptions) => Promise<TResponse>
}

export class ForgeHttpError<TBody = unknown> extends Error {
  readonly status: number
  readonly statusText: string
  readonly body: TBody
  readonly method: string
  readonly url: string

  constructor(input: { status: number; statusText: string; body: TBody; method: string; url: string }) {
    super(`${input.method} ${input.url} failed with ${input.status} ${input.statusText}`.trim())
    this.name = 'ForgeHttpError'
    this.status = input.status
    this.statusText = input.statusText
    this.body = input.body
    this.method = input.method
    this.url = input.url
  }
}

export function isForgeHttpError<TBody = unknown>(error: unknown): error is ForgeHttpError<TBody> {
  return error instanceof ForgeHttpError
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  return {
    async request<TResponse>(method: string, path: string, requestOptions: ApiRequestOptions = {}) {
      const fetchImpl = options.fetchImpl ?? fetch
      const url = buildUrl(options.baseUrl, path, requestOptions.params)
      const headers = await buildHeaders(options, requestOptions)
      const abortScope = createAbortScope(requestOptions.signal, requestOptions.timeoutMs ?? options.timeoutMs)
      const init: RequestInit = {
        method,
        headers,
        signal: abortScope.signal,
      }

      if (requestOptions.body !== undefined && method.toUpperCase() !== 'GET') {
        const body = requestOptions.body
        init.body = isNativeRequestBody(body) ? body : JSON.stringify(body)
        if (!isNativeRequestBody(body) && !hasHeader(headers, 'content-type')) {
          headers['content-type'] = 'application/json'
        }
      }

      await options.onRequest?.({ method, url, options: requestOptions })

      try {
        const retry = normalizeRetryOptions(options.retry)
        let attempt = 0

        while (true) {
          attempt += 1
          try {
            const response = await fetchImpl(url, init)
            await options.onResponse?.(response)
            const body = await parseResponseBody(response)
            if (!response.ok) {
              const error = new ForgeHttpError({ status: response.status, statusText: response.statusText, body, method, url })
              if (shouldRetryHttpError(error, method, retry, attempt)) {
                await wait(retry.delayMs)
                continue
              }

              throw error
            }

            return body as TResponse
          } catch (error) {
            if (error instanceof ForgeHttpError || isAbortError(error) || !shouldRetryNetworkError(method, retry, attempt)) {
              throw error
            }
            await wait(retry.delayMs)
          }
        }
      } catch (error) {
        await options.onError?.(error)
        throw error
      } finally {
        abortScope.cleanup()
      }
    },
  }
}

export function createApiClientOptions(options: ApiClientOptions): ApiClient {
  return createApiClient(options)
}

export function queryParam(value: unknown, options: ApiQueryParamOptions = {}): ApiQueryParam {
  return { value, ...options }
}

function buildUrl(baseUrl: string, path: string, params?: Record<string, unknown | ApiQueryParam>): string {
  if (baseUrl === '') {
    return buildRelativeUrl(path, params)
  }

  const url = new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`)
  for (const [key, value] of Object.entries(params ?? {})) {
    appendQueryParam(url.searchParams, key, value)
  }

  return url.toString()
}

function buildRelativeUrl(path: string, params?: Record<string, unknown | ApiQueryParam>): string {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params ?? {})) {
    appendQueryParam(searchParams, key, value)
  }

  const query = searchParams.toString()
  if (!query) return path
  return `${path}${path.includes('?') ? '&' : '?'}${query}`
}

function appendQueryParam(searchParams: URLSearchParams, key: string, input: unknown | ApiQueryParam): void {
  const param = isApiQueryParam(input) ? input : { value: input }
  const { value } = param
  if (value === undefined || value === null) return
  if (!Array.isArray(value)) {
    searchParams.append(key, String(value))
    return
  }
  const items = value.filter((item) => item !== undefined && item !== null)
  if (items.length === 0) return
  if (param.style === 'form' && param.explode === false) {
    searchParams.append(key, items.map(String).join(','))
    return
  }
  for (const item of items) {
    searchParams.append(key, String(item))
  }
}

function isApiQueryParam(value: unknown): value is ApiQueryParam {
  return typeof value === 'object' && value !== null && 'value' in value && ('style' in value || 'explode' in value)
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
  if (isJsonContentType(contentType)) {
    const text = await response.text()
    return text.trim() ? JSON.parse(text) : undefined
  }
  if (isBinaryContentType(contentType)) {
    return response.blob()
  }

  return response.text()
}

function isJsonContentType(contentType: string): boolean {
  const normalized = contentType.split(';')[0]?.trim().toLowerCase() ?? ''
  return normalized === 'application/json' || normalized.endsWith('+json')
}

function isBinaryContentType(contentType: string): boolean {
  const normalized = contentType.split(';')[0]?.trim().toLowerCase() ?? ''
  return normalized === 'application/octet-stream' || normalized === 'application/pdf' || normalized.startsWith('image/')
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  return Object.keys(headers).some((key) => key.toLowerCase() === name.toLowerCase())
}

function isNativeRequestBody(body: unknown): body is BodyInit {
  return (
    typeof body === 'string' ||
    isInstanceOfGlobal(body, 'FormData') ||
    isInstanceOfGlobal(body, 'URLSearchParams') ||
    isInstanceOfGlobal(body, 'Blob') ||
    isInstanceOfGlobal(body, 'ArrayBuffer') ||
    isInstanceOfGlobal(body, 'ReadableStream') ||
    ArrayBuffer.isView(body)
  )
}

function isInstanceOfGlobal(value: unknown, name: 'FormData' | 'URLSearchParams' | 'Blob' | 'ArrayBuffer' | 'ReadableStream'): boolean {
  const constructor = globalThis[name]
  return typeof constructor === 'function' && value instanceof constructor
}

function normalizeRetryOptions(retry: ApiRetryOptions | undefined): Required<ApiRetryOptions> {
  return {
    attempts: Math.max(1, retry?.attempts ?? 1),
    delayMs: Math.max(0, retry?.delayMs ?? 0),
    methods: retry?.methods ?? ['GET', 'HEAD', 'OPTIONS'],
    statuses: retry?.statuses ?? [408, 429, 500, 502, 503, 504],
  }
}

function shouldRetryHttpError(error: ForgeHttpError, method: string, retry: Required<ApiRetryOptions>, attempt: number): boolean {
  return attempt < retry.attempts && retry.methods.includes(method.toUpperCase()) && retry.statuses.includes(error.status)
}

function shouldRetryNetworkError(method: string, retry: Required<ApiRetryOptions>, attempt: number): boolean {
  return attempt < retry.attempts && retry.methods.includes(method.toUpperCase())
}

function createAbortScope(signal: AbortSignal | undefined, timeoutMs: number | undefined): { signal?: AbortSignal; cleanup: () => void } {
  if (timeoutMs === undefined) {
    return { signal, cleanup: () => {} }
  }

  const controller = new AbortController()
  const abortFromSignal = () => controller.abort(signal?.reason)
  const timeout = setTimeout(() => controller.abort(new DOMException(`Request timed out after ${timeoutMs}ms`, 'TimeoutError')), Math.max(0, timeoutMs))

  if (signal?.aborted) {
    abortFromSignal()
  } else {
    signal?.addEventListener('abort', abortFromSignal, { once: true })
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', abortFromSignal)
    },
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError')) ||
    (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError'))
  )
}

async function wait(delayMs: number): Promise<void> {
  if (delayMs <= 0) return
  await new Promise((resolve) => setTimeout(resolve, delayMs))
}
