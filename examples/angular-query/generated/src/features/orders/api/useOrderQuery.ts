// @archora-forge-generated
// @archora-forge-meta {"version":"2.1.0","schemaHash":"5462738c2a15","configHash":"3740e4dc71e2"}
import { injectQuery, type CreateQueryOptions } from '@tanstack/angular-query-experimental'
import { ordersClient } from '../../../shared/api/generated/orders/orders.client'
import { ordersQueryKeys } from '../../../shared/api/generated/orders/orders.query-keys'
import type {
  OrderDetailResponse,
  OrderId,
} from '../../../shared/api/generated/orders/orders.types'

export function useOrderQuery(
  id: OrderId,
  options?: Omit<CreateQueryOptions<OrderDetailResponse>, 'queryKey' | 'queryFn'>,
) {
  return injectQuery(() => ({
    queryKey: ordersQueryKeys.detail(id),
    queryFn: () => ordersClient.getOrder(id),
    ...options,
  }))
}
