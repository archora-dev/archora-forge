import { usersClient } from '../../../shared/api/generated/users/users.client'
import { usersQueryKeys } from '../../../shared/api/generated/users/users.query-keys'
import type {
  UsersListParams,
  UsersListResponse,
} from '../../../shared/api/generated/users/users.types'

export function useUsersQuery(params?: UsersListParams): Promise<UsersListResponse> {
  usersQueryKeys.list(params)
  return usersClient.listUsers(params)
}
