// @archora-forge-generated
// @archora-forge-meta {"version":"1.4.0","schemaHash":"5462738c2a15","configHash":"92d23261264d"}
import { createQuery, type CreateQueryOptions } from '@tanstack/svelte-query'
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
  return createQuery({
    queryKey: ordersQueryKeys.detail(id),
    queryFn: () => ordersClient.getOrder(id),
    ...options,
  })
}
