import type { Cart, CartItem, UpdateCartItemDto } from '../components.types'

export type { Cart, CartItem, UpdateCartItemDto } from '../components.types'

export type CartItemId = string

export type CartItemDetailResponse = CartItem

export type CartItemsListParams = Record<string, never>

export type CartItemsListResponse = unknown

export type CreateCartItemRequest = Partial<CartItem>

export type CreateCartItemResponse = CartItem

export type UpdateCartItemRequest = Partial<CartItem>

export type UpdateCartItemResponse = CartItem

export interface UpdateCartItemOperationParams {
  itemId: string
}

export type UpdateCartItemOperationRequest = UpdateCartItemDto

export type UpdateCartItemOperationResponse = Cart
