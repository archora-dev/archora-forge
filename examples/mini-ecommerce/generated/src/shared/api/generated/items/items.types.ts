// @archora-forge-generated
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
