import { ordersClient } from '../../../shared/api/generated/orders/orders.client'
import { ordersQueryKeys } from '../../../shared/api/generated/orders/orders.query-keys'
import type {
  OrdersListParams,
  OrdersListResponse,
} from '../../../shared/api/generated/orders/orders.types'

export function useOrdersQuery(params?: OrdersListParams): Promise<OrdersListResponse> {
  ordersQueryKeys.list(params)
  return ordersClient.listOrders(params)
}
