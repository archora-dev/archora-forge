import {
  createApiClient,
  type ApiClient,
  type ApiClientOptions,
  type ApiRequestOptions,
} from '@archora/forge-runtime'
import type {
  UpdateCartItemOperationParams,
  UpdateCartItemOperationRequest,
  UpdateCartItemOperationResponse,
} from './cartItems.types'

export type CartItemsRequestOptions = Omit<ApiRequestOptions, 'body' | 'params'>

let apiClient = createApiClient({ baseUrl: '' })

export function configureCartItemsClient(options: ApiClientOptions): void {
  apiClient = createApiClient(options)
}

export function setCartItemsClient(client: ApiClient): void {
  apiClient = client
}

export const cartItemsClient: {
  updateCartItem: (
    payload: UpdateCartItemOperationRequest,
    params: UpdateCartItemOperationParams,
    options?: CartItemsRequestOptions,
  ) => Promise<UpdateCartItemOperationResponse>
} = {
  updateCartItem: (payload, params, options) =>
    apiClient.request<UpdateCartItemOperationResponse>(
      'PATCH',
      `/cart/items/${encodeURIComponent(String(params.itemId))}`,
      { ...options, body: payload },
    ),
}
