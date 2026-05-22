import { contactsClient } from '../../../shared/api/generated/contacts/contacts.client'
import { contactsQueryKeys } from '../../../shared/api/generated/contacts/contacts.query-keys'
import type {
  ContactsListParams,
  ContactsListResponse,
} from '../../../shared/api/generated/contacts/contacts.types'

export function useContactsQuery(params?: ContactsListParams): Promise<ContactsListResponse> {
  contactsQueryKeys.list(params)
  return contactsClient.listContacts(params)
}
