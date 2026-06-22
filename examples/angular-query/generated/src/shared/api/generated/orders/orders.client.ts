// @archora-forge-generated
// @archora-forge-meta {"version":"1.4.0","schemaHash":"5462738c2a15","configHash":"3740e4dc71e2"}
import {
  createApiClient,
  type ApiClient,
  type ApiClientOptions,
  type ApiRequestOptions,
} from '@archora/forge-runtime'
import type {
  OrderId,
  OrderDetailResponse,
  CreateOrderRequest,
  CreateOrderResponse,
} from './orders.types'

export type OrdersRequestOptions = Omit<ApiRequestOptions, 'body' | 'params'>

let apiClient = createApiClient({ baseUrl: '' })

export function configureOrdersClient(options: ApiClientOptions): void {
  apiClient = createApiClient(options)
}

export function setOrdersClient(client: ApiClient): void {
  apiClient = client
}

export const ordersClient: {
  getOrder: (orderId: OrderId, options?: OrdersRequestOptions) => Promise<OrderDetailResponse>
  placeOrder: (
    payload: CreateOrderRequest,
    options?: OrdersRequestOptions,
  ) => Promise<CreateOrderResponse>
} = {
  getOrder: (orderId, options) =>
    apiClient.request<OrderDetailResponse>(
      'GET',
      `/orders/${encodeURIComponent(String(orderId))}`,
      options,
    ),
  placeOrder: (payload, options) =>
    apiClient.request<CreateOrderResponse>('POST', '/orders', { ...options, body: payload }),
}
