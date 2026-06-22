// @archora-forge-generated
// @archora-forge-meta {"version":"2.1.0","schemaHash":"5462738c2a15","configHash":"3740e4dc71e2"}
import {
  injectMutation,
  injectQueryClient,
  type CreateMutationOptions,
} from '@tanstack/angular-query-experimental'
import { ordersClient } from '../../../shared/api/generated/orders/orders.client'
import { ordersQueryKeys } from '../../../shared/api/generated/orders/orders.query-keys'
import type {
  CreateOrderRequest,
  CreateOrderResponse,
} from '../../../shared/api/generated/orders/orders.types'

export function useCreateOrderMutation(
  options?: Omit<
    CreateMutationOptions<CreateOrderResponse, Error, CreateOrderRequest>,
    'mutationFn'
  >,
) {
  const queryClient = injectQueryClient()
  return injectMutation(() => ({
    mutationFn: (input: CreateOrderRequest) => ordersClient.placeOrder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.list() })
    },
    ...options,
  }))
}
