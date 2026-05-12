import { usersClient } from '../../../shared/api/generated/users/users.client'
import { usersQueryKeys } from '../../../shared/api/generated/users/users.query-keys'
import type {
  UserId,
  UpdateUserRequest,
  UpdateUserResponse,
} from '../../../shared/api/generated/users/users.types'

export function useUpdateUserMutation(): {
  mutate: (input: { id: UserId; payload: UpdateUserRequest }) => Promise<UpdateUserResponse>
  invalidate: (id: UserId) => ReturnType<typeof usersQueryKeys.detail>
} {
  return {
    mutate: ({ id, payload }) => usersClient.updateUser(id, payload),
    invalidate: (id) => usersQueryKeys.detail(id),
  }
}
