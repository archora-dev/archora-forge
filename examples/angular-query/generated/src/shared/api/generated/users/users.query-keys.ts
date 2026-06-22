// @archora-forge-generated
// @archora-forge-meta {"version":"1.4.0","schemaHash":"5462738c2a15","configHash":"3740e4dc71e2"}
import type { UserId, UsersListParams } from './users.types'

export const usersQueryKeys = {
  all: ['users'] as const,
  list: (params?: UsersListParams) => [...usersQueryKeys.all, 'list', params] as const,
  detail: (id: UserId) => [...usersQueryKeys.all, 'detail', id] as const,
} as const
