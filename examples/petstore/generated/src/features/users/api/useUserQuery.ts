// @archora-forge-generated
// @archora-forge-meta {"version":"2.1.0","schemaHash":"5462738c2a15","configHash":"f1d971045876"}
import { usersClient } from '../../../shared/api/generated/users/users.client'
import { usersQueryKeys } from '../../../shared/api/generated/users/users.query-keys'
import type { UserDetailResponse, UserId } from '../../../shared/api/generated/users/users.types'

export function useUserQuery(id: UserId): Promise<UserDetailResponse> {
  usersQueryKeys.detail(id)
  return usersClient.getUser(id)
}
