// @archora-forge-generated
// @archora-forge-meta {"version":"1.2.0","schemaHash":"66e8f461600e","configHash":"f1d971045876"}
import type { CartId, CartsListParams } from './cart.types'

export const cartQueryKeys = {
  all: ['cart'] as const,
  list: (params?: CartsListParams) => [...cartQueryKeys.all, 'list', params] as const,
  detail: (id: CartId) => [...cartQueryKeys.all, 'detail', id] as const,
} as const
