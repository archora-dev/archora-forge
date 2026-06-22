// @archora-forge-generated
// @archora-forge-meta {"version":"2.1.0","schemaHash":"5462738c2a15","configHash":"eade995640b5"}
import type { OrderId, OrdersListParams } from './orders.types'

export const ordersQueryKeys = {
  all: ['orders'] as const,
  list: (params?: OrdersListParams) => [...ordersQueryKeys.all, 'list', params] as const,
  detail: (id: OrderId) => [...ordersQueryKeys.all, 'detail', id] as const,
} as const
