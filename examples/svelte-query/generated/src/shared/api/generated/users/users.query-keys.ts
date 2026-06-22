// @archora-forge-generated
// @archora-forge-meta {"version":"2.1.0","schemaHash":"5462738c2a15","configHash":"92d23261264d"}
import type { UserId, UsersListParams } from './users.types'

export const usersQueryKeys = {
  all: ['users'] as const,
  list: (params?: UsersListParams) => [...usersQueryKeys.all, 'list', params] as const,
  detail: (id: UserId) => [...usersQueryKeys.all, 'detail', id] as const,
} as const
