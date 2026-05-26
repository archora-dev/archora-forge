// @archora-forge-generated
// @archora-forge-meta {"version":"1.2.1","schemaHash":"66e8f461600e","configHash":"f1d971045876"}
import type { CartItemId, CartItemsListParams } from './cartItems.types'

export const cartItemsQueryKeys = {
  all: ['cartItems'] as const,
  list: (params?: CartItemsListParams) => [...cartItemsQueryKeys.all, 'list', params] as const,
  detail: (id: CartItemId) => [...cartItemsQueryKeys.all, 'detail', id] as const,
} as const
