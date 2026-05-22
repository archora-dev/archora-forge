// @archora-forge-generated
// @archora-forge-meta {"version":"1.1.0","schemaHash":"66e8f461600e","configHash":"f1d971045876"}
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
