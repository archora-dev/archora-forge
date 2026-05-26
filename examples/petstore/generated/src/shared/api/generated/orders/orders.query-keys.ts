// @archora-forge-generated
// @archora-forge-meta {"version":"1.2.1","schemaHash":"5462738c2a15","configHash":"f1d971045876"}
import type { OrderId, OrdersListParams } from './orders.types'

export const ordersQueryKeys = {
  all: ['orders'] as const,
  list: (params?: OrdersListParams) => [...ordersQueryKeys.all, 'list', params] as const,
  detail: (id: OrderId) => [...ordersQueryKeys.all, 'detail', id] as const,
} as const
