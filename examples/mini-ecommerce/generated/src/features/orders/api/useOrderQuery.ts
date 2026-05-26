// @archora-forge-generated
// @archora-forge-meta {"version":"1.2.1","schemaHash":"66e8f461600e","configHash":"f1d971045876"}
import { ordersClient } from '../../../shared/api/generated/orders/orders.client'
import { ordersQueryKeys } from '../../../shared/api/generated/orders/orders.query-keys'
import type {
  OrderDetailResponse,
  OrderId,
} from '../../../shared/api/generated/orders/orders.types'

export function useOrderQuery(id: OrderId): Promise<OrderDetailResponse> {
  ordersQueryKeys.detail(id)
  return ordersClient.getOrder(id)
}
