// @archora-forge-generated
import type { CartItemId, CartItemsListParams } from './cartItems.types'

export const cartItemsQueryKeys = {
  all: ['cartItems'] as const,
  list: (params?: CartItemsListParams) => [...cartItemsQueryKeys.all, 'list', params] as const,
  detail: (id: CartItemId) => [...cartItemsQueryKeys.all, 'detail', id] as const,
} as const
