// @archora-forge-generated
// @archora-forge-meta {"version":"1.4.0","schemaHash":"66e8f461600e","configHash":"f1d971045876"}
import type { ProductId, ProductsListParams } from './products.types'

export const productsQueryKeys = {
  all: ['products'] as const,
  list: (params?: ProductsListParams) => [...productsQueryKeys.all, 'list', params] as const,
  detail: (id: ProductId) => [...productsQueryKeys.all, 'detail', id] as const,
} as const
