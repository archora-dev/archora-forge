import {
  createApiClient,
  type ApiClient,
  type ApiClientOptions,
  type ApiRequestOptions,
} from '@archora/forge-runtime'
import type { MembersListParams, MembersListResponse } from './members.types'

export type MembersRequestOptions = Omit<ApiRequestOptions, 'body' | 'params'>

let apiClient = createApiClient({ baseUrl: '' })

export function configureMembersClient(options: ApiClientOptions): void {
  apiClient = createApiClient(options)
}

export function setMembersClient(client: ApiClient): void {
  apiClient = client
}

export const membersClient: {
  listMembers: (
    params?: MembersListParams,
    options?: MembersRequestOptions,
  ) => Promise<MembersListResponse>
} = {
  listMembers: (params, options) =>
    apiClient.request<MembersListResponse>('GET', `/members`, options),
}
