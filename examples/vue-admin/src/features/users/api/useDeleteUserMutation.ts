import { usersClient } from '../../../shared/api/generated/users/users.client'
import { usersQueryKeys } from '../../../shared/api/generated/users/users.query-keys'
import type { UserId } from '../../../shared/api/generated/users/users.types'

export function useDeleteUserMutation(): {
  mutate: (id: UserId) => Promise<void>
  invalidate: () => ReturnType<typeof usersQueryKeys.list>
} {
  return {
    mutate: (id) => usersClient.deleteUser(id),
    invalidate: () => usersQueryKeys.list(),
  }
}
