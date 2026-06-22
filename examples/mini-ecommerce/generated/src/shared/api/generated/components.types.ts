// @archora-forge-generated
// @archora-forge-meta {"version":"2.1.0","schemaHash":"66e8f461600e","configHash":"f1d971045876"}
export type OrderStatus = 'draft' | 'paid' | 'shipped' | 'delivered' | 'cancelled'

export interface Money {
  amount: number
  currency: string
}

export interface Product {
  id: string
  name: string
  slug?: string
  category?: string
  description?: string
  price: Money
  inStock?: boolean
  rating?: number
  images?: string[]
}

export interface ProductPage {
  items: Product[]
  total: number
  page: number
  pageSize: number
}

export interface CartItem {
  id: string
  productId: string
  quantity: number
  lineTotal: Money
}

export interface Cart {
  items: CartItem[]
  subtotal: Money
  shipping?: Money
  tax?: Money
  total: Money
}

export interface AddCartItemDto {
  productId: string
  quantity: number
}

export interface UpdateCartItemDto {
  quantity: number
}

export interface Order {
  id: string
  status: OrderStatus
  items?: CartItem[]
  total: Money
  placedAt: string
  shippingAddress?: Address
}

export interface CheckoutDto {
  shippingAddressId: string
  paymentMethodId: string
  couponCode?: string
}

export interface Address {
  line1: string
  line2?: string
  city: string
  region?: string
  postalCode?: string
  country: string
}

export interface Customer {
  id: string
  email: string
  firstName?: string
  lastName?: string
  addresses?: Address[]
}

export interface UpdateCustomerDto {
  firstName?: string
  lastName?: string
  email?: string
}
