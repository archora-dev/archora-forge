// @archora-forge-generated
// @archora-forge-meta {"version":"1.4.0","schemaHash":"5462738c2a15","configHash":"92d23261264d"}
import type { OrderId, OrdersListParams } from './orders.types'

export const ordersQueryKeys = {
  all: ['orders'] as const,
  list: (params?: OrdersListParams) => [...ordersQueryKeys.all, 'list', params] as const,
  detail: (id: OrderId) => [...ordersQueryKeys.all, 'detail', id] as const,
} as const
