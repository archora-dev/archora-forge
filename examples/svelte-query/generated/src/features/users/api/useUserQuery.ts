// @archora-forge-generated
// @archora-forge-meta {"version":"1.4.0","schemaHash":"5462738c2a15","configHash":"92d23261264d"}
import { createQuery, type CreateQueryOptions } from '@tanstack/svelte-query'
import { usersClient } from '../../../shared/api/generated/users/users.client'
import { usersQueryKeys } from '../../../shared/api/generated/users/users.query-keys'
import type { UserDetailResponse, UserId } from '../../../shared/api/generated/users/users.types'

export function useUserQuery(
  id: UserId,
  options?: Omit<CreateQueryOptions<UserDetailResponse>, 'queryKey' | 'queryFn'>,
) {
  return createQuery({
    queryKey: usersQueryKeys.detail(id),
    queryFn: () => usersClient.getUser(id),
    ...options,
  })
}
