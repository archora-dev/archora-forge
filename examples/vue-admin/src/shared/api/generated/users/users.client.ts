import { createApiClient } from '@archora/forge-runtime'
import type {
  UsersListParams,
  UsersListResponse,
  UserId,
  UserDetailResponse,
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserRequest,
  UpdateUserResponse,
} from './users.types'

const apiClient = createApiClient({ baseUrl: '' })

export const usersClient: {
  listUsers: (params?: UsersListParams) => Promise<UsersListResponse>
  getUser: (id: UserId) => Promise<UserDetailResponse>
  createUser: (payload: CreateUserRequest) => Promise<CreateUserResponse>
  updateUser: (id: UserId, payload: UpdateUserRequest) => Promise<UpdateUserResponse>
  deleteUser: (id: UserId) => Promise<void>
} = {
  listUsers: (params) =>
    apiClient.request<UsersListResponse>('GET', '/users', {
      params: params as Record<string, unknown> | undefined,
    }),
  getUser: (id) => apiClient.request<UserDetailResponse>('GET', `/users/${id}`),
  createUser: (payload) =>
    apiClient.request<CreateUserResponse>('POST', '/users', { body: payload }),
  updateUser: (id, payload) =>
    apiClient.request<UpdateUserResponse>('PATCH', `/users/${id}`, { body: payload }),
  deleteUser: (id) => apiClient.request<void>('DELETE', `/users/${id}`),
}
