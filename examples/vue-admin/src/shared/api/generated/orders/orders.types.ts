import type { CreateOrderDto, Order, UpdateOrderDto } from '../components.types'

export type { CreateOrderDto, Order, UpdateOrderDto } from '../components.types'

export type OrderId = string

export type OrderDetailResponse = Order

export type OrdersListParams = Record<string, never>

export interface OrdersListResponse {
  items?: Order[]
  total?: number
  page?: number
}

export type CreateOrderRequest = CreateOrderDto

export type CreateOrderResponse = Order

export type UpdateOrderRequest = UpdateOrderDto

export type UpdateOrderResponse = Order
