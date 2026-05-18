// @archora-forge-generated
import {
  createApiClient,
  type ApiClient,
  type ApiClientOptions,
  type ApiRequestOptions,
} from '@archora/forge-runtime'
import type {
  SearchWorkspaceOperationParams,
  SearchWorkspaceOperationResponse,
} from './search.types'

export type SearchRequestOptions = Omit<ApiRequestOptions, 'body' | 'params'>

let apiClient = createApiClient({ baseUrl: '' })

export function configureSearchesClient(options: ApiClientOptions): void {
  apiClient = createApiClient(options)
}

export function setSearchesClient(client: ApiClient): void {
  apiClient = client
}

export const searchClient: {
  searchWorkspace: (
    params: SearchWorkspaceOperationParams,
    options?: SearchRequestOptions,
  ) => Promise<SearchWorkspaceOperationResponse>
} = {
  searchWorkspace: (params, options) =>
    apiClient.request<SearchWorkspaceOperationResponse>('GET', '/search', {
      ...options,
      params: { q: params.q, type: params.type },
    }),
}
