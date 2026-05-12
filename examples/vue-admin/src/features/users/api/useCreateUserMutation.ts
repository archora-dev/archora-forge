import { usersClient } from '../../../shared/api/generated/users/users.client'
import { usersQueryKeys } from '../../../shared/api/generated/users/users.query-keys'
import type {
  CreateUserRequest,
  CreateUserResponse,
} from '../../../shared/api/generated/users/users.types'

export function useCreateUserMutation(): {
  mutate: (payload: CreateUserRequest) => Promise<CreateUserResponse>
  invalidate: () => ReturnType<typeof usersQueryKeys.list>
} {
  return {
    mutate: (payload: CreateUserRequest) => usersClient.createUser(payload),
    invalidate: () => usersQueryKeys.list(),
  }
}
