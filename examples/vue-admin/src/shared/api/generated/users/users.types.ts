import type { User } from '../components.types'

export type { User } from '../components.types'

export type UserId = string

export type UserDetailResponse = User

export type UsersListParams = Record<string, never>

export interface UsersListResponse {
  items?: User[]
  total?: number
  page?: number
}

export type CreateUserRequest = Partial<User>

export type CreateUserResponse = User

export type UpdateUserRequest = Partial<User>

export type UpdateUserResponse = User
