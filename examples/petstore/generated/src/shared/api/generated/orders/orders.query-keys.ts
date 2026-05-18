import type { OrderId, OrdersListParams } from './orders.types'

export const ordersQueryKeys = {
  all: ['orders'] as const,
  list: (params?: OrdersListParams) => [...ordersQueryKeys.all, 'list', params] as const,
  detail: (id: OrderId) => [...ordersQueryKeys.all, 'detail', id] as const,
} as const
