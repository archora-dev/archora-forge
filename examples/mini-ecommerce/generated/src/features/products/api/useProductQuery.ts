import { productsClient } from '../../../shared/api/generated/products/products.client'
import { productsQueryKeys } from '../../../shared/api/generated/products/products.query-keys'
import type {
  ProductDetailResponse,
  ProductId,
} from '../../../shared/api/generated/products/products.types'

export function useProductQuery(id: ProductId): Promise<ProductDetailResponse> {
  productsQueryKeys.detail(id)
  return productsClient.getProduct(id)
}
