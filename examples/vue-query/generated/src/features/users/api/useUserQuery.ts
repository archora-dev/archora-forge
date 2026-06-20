// @archora-forge-generated
// @archora-forge-meta {"version":"1.3.0","schemaHash":"5462738c2a15","configHash":"eade995640b5"}
import { useQuery, type UseQueryOptions } from '@tanstack/vue-query'
import { usersClient } from '../../../shared/api/generated/users/users.client'
import { usersQueryKeys } from '../../../shared/api/generated/users/users.query-keys'
import type { UserDetailResponse, UserId } from '../../../shared/api/generated/users/users.types'

export function useUserQuery(
  id: UserId,
  options?: Omit<UseQueryOptions<UserDetailResponse>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: usersQueryKeys.detail(id),
    queryFn: () => usersClient.getUser(id),
    ...options,
  })
}
