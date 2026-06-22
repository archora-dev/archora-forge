// @archora-forge-generated
// @archora-forge-meta {"version":"2.1.0","schemaHash":"5462738c2a15","configHash":"eade995640b5"}
import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/vue-query'
import { ordersClient } from '../../../shared/api/generated/orders/orders.client'
import { ordersQueryKeys } from '../../../shared/api/generated/orders/orders.query-keys'
import type {
  CreateOrderRequest,
  CreateOrderResponse,
} from '../../../shared/api/generated/orders/orders.types'

export function useCreateOrderMutation(
  options?: Omit<UseMutationOptions<CreateOrderResponse, Error, CreateOrderRequest>, 'mutationFn'>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateOrderRequest) => ordersClient.placeOrder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.list() })
    },
    ...options,
  })
}
