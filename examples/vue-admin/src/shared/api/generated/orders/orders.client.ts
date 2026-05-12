import { createApiClient } from '@archora/forge-runtime'
import type {
  OrdersListParams,
  OrdersListResponse,
  OrderId,
  OrderDetailResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  UpdateOrderRequest,
  UpdateOrderResponse,
} from './orders.types'

const apiClient = createApiClient({ baseUrl: '' })

export const ordersClient: {
  listOrders: (params?: OrdersListParams) => Promise<OrdersListResponse>
  getOrder: (id: OrderId) => Promise<OrderDetailResponse>
  createOrder: (payload: CreateOrderRequest) => Promise<CreateOrderResponse>
  updateOrder: (id: OrderId, payload: UpdateOrderRequest) => Promise<UpdateOrderResponse>
  deleteOrder: (id: OrderId) => Promise<void>
} = {
  listOrders: (params) =>
    apiClient.request<OrdersListResponse>('GET', '/orders', {
      params: params as Record<string, unknown> | undefined,
    }),
  getOrder: (id) => apiClient.request<OrderDetailResponse>('GET', `/orders/${id}`),
  createOrder: (payload) =>
    apiClient.request<CreateOrderResponse>('POST', '/orders', { body: payload }),
  updateOrder: (id, payload) =>
    apiClient.request<UpdateOrderResponse>('PATCH', `/orders/${id}`, { body: payload }),
  deleteOrder: (id) => apiClient.request<void>('DELETE', `/orders/${id}`),
}
