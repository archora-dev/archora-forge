import type { CartId, CartsListParams } from './cart.types'

export const cartQueryKeys = {
  all: ['cart'] as const,
  list: (params?: CartsListParams) => [...cartQueryKeys.all, 'list', params] as const,
  detail: (id: CartId) => [...cartQueryKeys.all, 'detail', id] as const,
} as const
