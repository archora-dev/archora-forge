// @archora-forge-generated
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
