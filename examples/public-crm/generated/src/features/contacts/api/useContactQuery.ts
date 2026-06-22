// @archora-forge-generated
// @archora-forge-meta {"version":"2.0.0","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
import { contactsClient } from '../../../shared/api/generated/contacts/contacts.client'
import { contactsQueryKeys } from '../../../shared/api/generated/contacts/contacts.query-keys'
import type {
  ContactDetailResponse,
  ContactId,
} from '../../../shared/api/generated/contacts/contacts.types'

export function useContactQuery(id: ContactId): Promise<ContactDetailResponse> {
  contactsQueryKeys.detail(id)
  return contactsClient.getContact(id)
}
