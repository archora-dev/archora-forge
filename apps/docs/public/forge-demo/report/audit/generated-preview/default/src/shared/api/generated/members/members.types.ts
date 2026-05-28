export interface Member {
  [key: string]: unknown
}

export type MemberId = string

export type MemberDetailResponse = Member

export type MembersListParams = Record<string, never>

export interface MembersListResponse {
  id: string
}
;[]

export type CreateMemberRequest = Partial<Member>

export type CreateMemberResponse = Member

export type UpdateMemberRequest = Partial<Member>

export type UpdateMemberResponse = Member
