// @archora-forge-generated
// @archora-forge-meta {"version":"1.3.0","schemaHash":"5462738c2a15","configHash":"f1d971045876"}
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
