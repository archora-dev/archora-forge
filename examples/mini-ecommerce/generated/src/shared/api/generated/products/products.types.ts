// @archora-forge-generated
// @archora-forge-meta {"version":"1.1.0","schemaHash":"66e8f461600e","configHash":"f1d971045876"}
import type { Product, ProductPage } from '../components.types'

export type { Product, ProductPage } from '../components.types'

export type ProductId = string

export type ProductDetailResponse = Product

export interface ProductsListParams {
  category?: string
  search?: string
  page?: number
  pageSize?: number
}

export type ProductsListResponse = ProductPage

export type CreateProductRequest = Partial<Product>

export type CreateProductResponse = Product

export type UpdateProductRequest = Partial<Product>

export type UpdateProductResponse = Product
