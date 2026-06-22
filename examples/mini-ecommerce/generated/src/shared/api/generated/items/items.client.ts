// @archora-forge-generated
// @archora-forge-meta {"version":"2.0.0","schemaHash":"66e8f461600e","configHash":"f1d971045876"}
import {
  createApiClient,
  type ApiClient,
  type ApiClientOptions,
  type ApiRequestOptions,
} from '@archora/forge-runtime'
import type { CreateItemRequest, CreateItemResponse, ItemId } from './items.types'

export type ItemsRequestOptions = Omit<ApiRequestOptions, 'body' | 'params'>

let apiClient = createApiClient({ baseUrl: '' })

export function configureItemsClient(options: ApiClientOptions): void {
  apiClient = createApiClient(options)
}

export function setItemsClient(client: ApiClient): void {
  apiClient = client
}

export const itemsClient: {
  addCartItem: (
    payload: CreateItemRequest,
    options?: ItemsRequestOptions,
  ) => Promise<CreateItemResponse>
  removeCartItem: (itemId: ItemId, options?: ItemsRequestOptions) => Promise<void>
} = {
  addCartItem: (payload, options) =>
    apiClient.request<CreateItemResponse>('POST', '/cart/items', { ...options, body: payload }),
  removeCartItem: (itemId, options) =>
    apiClient.request<void>('DELETE', `/cart/items/${encodeURIComponent(String(itemId))}`, options),
}
