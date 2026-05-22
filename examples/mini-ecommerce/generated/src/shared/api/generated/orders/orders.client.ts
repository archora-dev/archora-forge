// @archora-forge-generated
// @archora-forge-meta {"version":"1.1.0","schemaHash":"66e8f461600e","configHash":"f1d971045876"}
import {
  createApiClient,
  type ApiClient,
  type ApiClientOptions,
  type ApiRequestOptions,
} from '@archora/forge-runtime'
import type {
  OrdersListParams,
  OrdersListResponse,
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
  listOrders: (
    params?: OrdersListParams,
    options?: OrdersRequestOptions,
  ) => Promise<OrdersListResponse>
  getOrder: (orderId: OrderId, options?: OrdersRequestOptions) => Promise<OrderDetailResponse>
  checkout: (
    payload: CreateOrderRequest,
    options?: OrdersRequestOptions,
  ) => Promise<CreateOrderResponse>
} = {
  listOrders: (params, options) =>
    apiClient.request<OrdersListResponse>('GET', `/orders`, {
      ...options,
      params: params as Record<string, unknown> | undefined,
    }),
  getOrder: (orderId, options) =>
    apiClient.request<OrderDetailResponse>(
      'GET',
      `/orders/${encodeURIComponent(String(orderId))}`,
      options,
    ),
  checkout: (payload, options) =>
    apiClient.request<CreateOrderResponse>('POST', '/orders', { ...options, body: payload }),
}
