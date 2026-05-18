// @archora-forge-generated
import type { UserId, UsersListParams } from './users.types'

export const usersQueryKeys = {
  all: ['users'] as const,
  list: (params?: UsersListParams) => [...usersQueryKeys.all, 'list', params] as const,
  detail: (id: UserId) => [...usersQueryKeys.all, 'detail', id] as const,
} as const
