import type { CheckoutDto, Order } from '../components.types'

export type { CheckoutDto, Order } from '../components.types'

export type OrderId = string

export type OrderDetailResponse = Order

export interface OrdersListParams {
  status?: 'draft' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
}

export type OrdersListResponse = Order[]

export type CreateOrderRequest = CheckoutDto

export type CreateOrderResponse = Order

export type UpdateOrderRequest = Partial<Order>

export type UpdateOrderResponse = Order
