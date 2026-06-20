// @archora-forge-generated
// @archora-forge-meta {"version":"1.4.0","schemaHash":"5462738c2a15","configHash":"eade995640b5"}
import { useQuery, type UseQueryOptions } from '@tanstack/vue-query'
import { ordersClient } from '../../../shared/api/generated/orders/orders.client'
import { ordersQueryKeys } from '../../../shared/api/generated/orders/orders.query-keys'
import type {
  OrderDetailResponse,
  OrderId,
} from '../../../shared/api/generated/orders/orders.types'

export function useOrderQuery(
  id: OrderId,
  options?: Omit<UseQueryOptions<OrderDetailResponse>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: ordersQueryKeys.detail(id),
    queryFn: () => ordersClient.getOrder(id),
    ...options,
  })
}
