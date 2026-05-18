// @archora-forge-generated
import { cartClient } from '../../../shared/api/generated/cart/cart.client'
import { cartQueryKeys } from '../../../shared/api/generated/cart/cart.query-keys'
import type {
  CartsListParams,
  CartsListResponse,
} from '../../../shared/api/generated/cart/cart.types'

export function useCartsQuery(params?: CartsListParams): Promise<CartsListResponse> {
  cartQueryKeys.list(params)
  return cartClient.getCart(params)
}
