// @archora-forge-generated
// @archora-forge-meta {"version":"2.1.0","schemaHash":"66e8f461600e","configHash":"f1d971045876"}
import { productsClient } from '../../../shared/api/generated/products/products.client'
import { productsQueryKeys } from '../../../shared/api/generated/products/products.query-keys'
import type {
  ProductsListParams,
  ProductsListResponse,
} from '../../../shared/api/generated/products/products.types'

export function useProductsQuery(params?: ProductsListParams): Promise<ProductsListResponse> {
  productsQueryKeys.list(params)
  return productsClient.listProducts(params)
}
