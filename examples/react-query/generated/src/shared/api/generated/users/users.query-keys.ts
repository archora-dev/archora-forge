// @archora-forge-generated
// @archora-forge-meta {"version":"1.3.0","schemaHash":"5462738c2a15","configHash":"7258580f1759"}
import type { UserId, UsersListParams } from './users.types'

export const usersQueryKeys = {
  all: ['users'] as const,
  list: (params?: UsersListParams) => [...usersQueryKeys.all, 'list', params] as const,
  detail: (id: UserId) => [...usersQueryKeys.all, 'detail', id] as const,
} as const
