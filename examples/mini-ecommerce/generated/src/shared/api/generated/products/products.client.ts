// @archora-forge-generated
// @archora-forge-meta {"version":"1.2.0","schemaHash":"66e8f461600e","configHash":"f1d971045876"}
import {
  createApiClient,
  type ApiClient,
  type ApiClientOptions,
  type ApiRequestOptions,
} from '@archora/forge-runtime'
import type {
  ProductsListParams,
  ProductsListResponse,
  ProductId,
  ProductDetailResponse,
} from './products.types'

export type ProductsRequestOptions = Omit<ApiRequestOptions, 'body' | 'params'>

let apiClient = createApiClient({ baseUrl: '' })

export function configureProductsClient(options: ApiClientOptions): void {
  apiClient = createApiClient(options)
}

export function setProductsClient(client: ApiClient): void {
  apiClient = client
}

export const productsClient: {
  listProducts: (
    params?: ProductsListParams,
    options?: ProductsRequestOptions,
  ) => Promise<ProductsListResponse>
  getProduct: (
    productId: ProductId,
    options?: ProductsRequestOptions,
  ) => Promise<ProductDetailResponse>
} = {
  listProducts: (params, options) =>
    apiClient.request<ProductsListResponse>('GET', `/products`, {
      ...options,
      params: params as Record<string, unknown> | undefined,
    }),
  getProduct: (productId, options) =>
    apiClient.request<ProductDetailResponse>(
      'GET',
      `/products/${encodeURIComponent(String(productId))}`,
      options,
    ),
}
