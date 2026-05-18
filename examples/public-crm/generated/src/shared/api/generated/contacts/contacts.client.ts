// @archora-forge-generated
import {
  createApiClient,
  type ApiClient,
  type ApiClientOptions,
  type ApiRequestOptions,
} from '@archora/forge-runtime'
import type {
  ContactsListParams,
  ContactsListResponse,
  ContactId,
  ContactDetailResponse,
  CreateContactRequest,
  CreateContactResponse,
  UpdateContactRequest,
  UpdateContactResponse,
} from './contacts.types'

export type ContactsRequestOptions = Omit<ApiRequestOptions, 'body' | 'params'>

let apiClient = createApiClient({ baseUrl: '' })

export function configureContactsClient(options: ApiClientOptions): void {
  apiClient = createApiClient(options)
}

export function setContactsClient(client: ApiClient): void {
  apiClient = client
}

export const contactsClient: {
  listContacts: (
    params?: ContactsListParams,
    options?: ContactsRequestOptions,
  ) => Promise<ContactsListResponse>
  getContact: (
    contactId: ContactId,
    options?: ContactsRequestOptions,
  ) => Promise<ContactDetailResponse>
  createContact: (
    payload: CreateContactRequest,
    options?: ContactsRequestOptions,
  ) => Promise<CreateContactResponse>
  updateContact: (
    contactId: ContactId,
    payload: UpdateContactRequest,
    options?: ContactsRequestOptions,
  ) => Promise<UpdateContactResponse>
  deleteContact: (contactId: ContactId, options?: ContactsRequestOptions) => Promise<void>
} = {
  listContacts: (params, options) =>
    apiClient.request<ContactsListResponse>('GET', `/contacts`, {
      ...options,
      params: params as Record<string, unknown> | undefined,
    }),
  getContact: (contactId, options) =>
    apiClient.request<ContactDetailResponse>(
      'GET',
      `/contacts/${encodeURIComponent(String(contactId))}`,
      options,
    ),
  createContact: (payload, options) =>
    apiClient.request<CreateContactResponse>('POST', '/contacts', { ...options, body: payload }),
  updateContact: (contactId, payload, options) =>
    apiClient.request<UpdateContactResponse>(
      'PATCH',
      `/contacts/${encodeURIComponent(String(contactId))}`,
      { ...options, body: payload },
    ),
  deleteContact: (contactId, options) =>
    apiClient.request<void>(
      'DELETE',
      `/contacts/${encodeURIComponent(String(contactId))}`,
      options,
    ),
}
