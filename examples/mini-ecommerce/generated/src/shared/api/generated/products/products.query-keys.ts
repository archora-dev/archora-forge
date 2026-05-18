// @archora-forge-generated
import type { ProductId, ProductsListParams } from './products.types'

export const productsQueryKeys = {
  all: ['products'] as const,
  list: (params?: ProductsListParams) => [...productsQueryKeys.all, 'list', params] as const,
  detail: (id: ProductId) => [...productsQueryKeys.all, 'detail', id] as const,
} as const
