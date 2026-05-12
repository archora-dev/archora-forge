import { ordersClient } from '../../../shared/api/generated/orders/orders.client'
import { ordersQueryKeys } from '../../../shared/api/generated/orders/orders.query-keys'
import type {
  OrderId,
  UpdateOrderRequest,
  UpdateOrderResponse,
} from '../../../shared/api/generated/orders/orders.types'

export function useUpdateOrderMutation(): {
  mutate: (input: { id: OrderId; payload: UpdateOrderRequest }) => Promise<UpdateOrderResponse>
  invalidate: (id: OrderId) => ReturnType<typeof ordersQueryKeys.detail>
} {
  return {
    mutate: ({ id, payload }) => ordersClient.updateOrder(id, payload),
    invalidate: (id) => ordersQueryKeys.detail(id),
  }
}
