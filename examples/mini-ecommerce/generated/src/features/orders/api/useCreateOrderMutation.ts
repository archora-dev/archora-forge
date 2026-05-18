import { ordersClient } from '../../../shared/api/generated/orders/orders.client'
import { ordersQueryKeys } from '../../../shared/api/generated/orders/orders.query-keys'
import type {
  CreateOrderRequest,
  CreateOrderResponse,
} from '../../../shared/api/generated/orders/orders.types'

export function useCreateOrderMutation(): {
  mutate: (payload: CreateOrderRequest) => Promise<CreateOrderResponse>
  invalidate: () => ReturnType<typeof ordersQueryKeys.list>
} {
  return {
    mutate: (payload: CreateOrderRequest) => ordersClient.checkout(payload),
    invalidate: () => ordersQueryKeys.list(),
  }
}
