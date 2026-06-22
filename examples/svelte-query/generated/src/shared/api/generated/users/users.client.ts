// @archora-forge-generated
// @archora-forge-meta {"version":"2.1.0","schemaHash":"5462738c2a15","configHash":"92d23261264d"}
import {
  createApiClient,
  type ApiClient,
  type ApiClientOptions,
  type ApiRequestOptions,
} from '@archora/forge-runtime'
import type { UserId, UserDetailResponse } from './users.types'

export type UsersRequestOptions = Omit<ApiRequestOptions, 'body' | 'params'>

let apiClient = createApiClient({ baseUrl: '' })

export function configureUsersClient(options: ApiClientOptions): void {
  apiClient = createApiClient(options)
}

export function setUsersClient(client: ApiClient): void {
  apiClient = client
}

export const usersClient: {
  getUser: (username: UserId, options?: UsersRequestOptions) => Promise<UserDetailResponse>
} = {
  getUser: (username, options) =>
    apiClient.request<UserDetailResponse>(
      'GET',
      `/users/${encodeURIComponent(String(username))}`,
      options,
    ),
}
