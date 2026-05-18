import { cartItemsClient } from '../../../shared/api/generated/cartItems/cartItems.client'
import type {
  UpdateCartItemOperationRequest,
  UpdateCartItemOperationParams,
  UpdateCartItemOperationResponse,
} from '../../../shared/api/generated/cartItems/cartItems.types'

type UpdateCartItemOperationInput = {
  payload: UpdateCartItemOperationRequest
  params: UpdateCartItemOperationParams
}

export function useUpdateCartItemMutation(): {
  mutate: (input: UpdateCartItemOperationInput) => Promise<UpdateCartItemOperationResponse>
} {
  return {
    mutate: (input) => cartItemsClient.updateCartItem(input.payload, input.params),
  }
}
