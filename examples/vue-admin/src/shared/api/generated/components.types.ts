export type UserStatus = 'active' | 'blocked' | 'pending'

export type OrderStatus = 'draft' | 'paid' | 'shipped'

export type CreateOrderDtoStatus = 'draft' | 'paid' | 'shipped'

export type UpdateOrderDtoStatus = 'draft' | 'paid' | 'shipped'

export type ReportStatus = 'ready' | 'processing' | 'failed'

export interface User {
  id: string
  name?: string
  email: string
  status?: UserStatus
  age?: number | null
  verified?: boolean
  createdAt?: string
  profile?: {
    city?: string
    timezone?: string
  }
}

export interface Order {
  id: string
  number: string
  status: OrderStatus
  total: number
  paid?: boolean
  dueDate?: string
  customer?: {
    name?: string
  }
}

export interface CreateOrderDto {
  number: string
  status: CreateOrderDtoStatus
  total: number
  paid?: boolean
  dueDate?: string
  customer?: {
    name?: string
  }
}

export interface UpdateOrderDto {
  status?: UpdateOrderDtoStatus
  total?: number
  paid?: boolean
  dueDate?: string
}

export interface Report {
  id: string
  title: string
  status: ReportStatus
  generatedAt: string
  owner?: string
  rows?: number
}
