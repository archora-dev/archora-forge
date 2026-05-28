import { membersClient } from '../../../shared/api/generated/members/members.client'
import { membersQueryKeys } from '../../../shared/api/generated/members/members.query-keys'
import type {
  MembersListParams,
  MembersListResponse,
} from '../../../shared/api/generated/members/members.types'

export function useMembersQuery(params?: MembersListParams): Promise<MembersListResponse> {
  membersQueryKeys.list(params)
  return membersClient.listMembers(params)
}
