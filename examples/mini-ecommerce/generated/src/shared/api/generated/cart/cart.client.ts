import {
  createApiClient,
  type ApiClient,
  type ApiClientOptions,
  type ApiRequestOptions,
} from '@archora/forge-runtime'
import type { CartsListParams, CartsListResponse } from './cart.types'

export type CartRequestOptions = Omit<ApiRequestOptions, 'body' | 'params'>

let apiClient = createApiClient({ baseUrl: '' })

export function configureCartsClient(options: ApiClientOptions): void {
  apiClient = createApiClient(options)
}

export function setCartsClient(client: ApiClient): void {
  apiClient = client
}

export const cartClient: {
  getCart: (params?: CartsListParams, options?: CartRequestOptions) => Promise<CartsListResponse>
} = {
  getCart: (params, options) => apiClient.request<CartsListResponse>('GET', `/cart`, options),
}
