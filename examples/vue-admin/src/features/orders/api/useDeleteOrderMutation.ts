import { ordersClient } from '../../../shared/api/generated/orders/orders.client'
import { ordersQueryKeys } from '../../../shared/api/generated/orders/orders.query-keys'
import type { OrderId } from '../../../shared/api/generated/orders/orders.types'

export function useDeleteOrderMutation(): {
  mutate: (id: OrderId) => Promise<void>
  invalidate: () => ReturnType<typeof ordersQueryKeys.list>
} {
  return {
    mutate: (id) => ordersClient.deleteOrder(id),
    invalidate: () => ordersQueryKeys.list(),
  }
}
