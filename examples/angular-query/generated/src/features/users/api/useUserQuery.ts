// @archora-forge-generated
// @archora-forge-meta {"version":"2.1.0","schemaHash":"5462738c2a15","configHash":"3740e4dc71e2"}
import { injectQuery, type CreateQueryOptions } from '@tanstack/angular-query-experimental'
import { usersClient } from '../../../shared/api/generated/users/users.client'
import { usersQueryKeys } from '../../../shared/api/generated/users/users.query-keys'
import type { UserDetailResponse, UserId } from '../../../shared/api/generated/users/users.types'

export function useUserQuery(
  id: UserId,
  options?: Omit<CreateQueryOptions<UserDetailResponse>, 'queryKey' | 'queryFn'>,
) {
  return injectQuery(() => ({
    queryKey: usersQueryKeys.detail(id),
    queryFn: () => usersClient.getUser(id),
    ...options,
  }))
}
