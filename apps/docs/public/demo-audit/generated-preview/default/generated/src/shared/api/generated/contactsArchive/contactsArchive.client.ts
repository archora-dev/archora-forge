import {
  createApiClient,
  type ApiClient,
  type ApiClientOptions,
  type ApiRequestOptions,
} from '@archora/forge-runtime'
import type {
  ArchiveContactOperationParams,
  ArchiveContactOperationRequest,
  ArchiveContactOperationResponse,
} from './contactsArchive.types'

export type ContactsArchiveRequestOptions = Omit<ApiRequestOptions, 'body' | 'params'>

let apiClient = createApiClient({ baseUrl: '' })

export function configureContactsArchivesClient(options: ApiClientOptions): void {
  apiClient = createApiClient(options)
}

export function setContactsArchivesClient(client: ApiClient): void {
  apiClient = client
}

export const contactsArchiveClient: {
  archiveContact: (
    payload: ArchiveContactOperationRequest,
    params: ArchiveContactOperationParams,
    options?: ContactsArchiveRequestOptions,
  ) => Promise<ArchiveContactOperationResponse>
} = {
  archiveContact: (payload, params, options) =>
    apiClient.request<ArchiveContactOperationResponse>(
      'POST',
      `/contacts/${encodeURIComponent(String(params.contactId))}/archive`,
      { ...options, body: payload },
    ),
}
