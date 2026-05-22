// @archora-forge-generated
// @archora-forge-meta {"version":"1.1.0","schemaHash":"66e8f461600e","configHash":"f1d971045876"}
import type { AddCartItemDto, Cart } from '../components.types'

export type { AddCartItemDto, Cart } from '../components.types'

export interface Item {
  [key: string]: unknown
}

export type ItemId = string

export type ItemDetailResponse = Item

export type ItemsListParams = Record<string, never>

export type ItemsListResponse = unknown

export type CreateItemRequest = AddCartItemDto

export type CreateItemResponse = Cart

export type UpdateItemRequest = Partial<Item>

export type UpdateItemResponse = Item
