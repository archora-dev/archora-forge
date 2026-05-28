import type { MemberId, MembersListParams } from './members.types'

export const membersQueryKeys = {
  all: ['members'] as const,
  list: (params?: MembersListParams) => [...membersQueryKeys.all, 'list', params] as const,
  detail: (id: MemberId) => [...membersQueryKeys.all, 'detail', id] as const,
} as const
