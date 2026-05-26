// @archora-forge-generated
// @archora-forge-meta {"version":"1.2.2","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
import { contactsClient } from '../../../shared/api/generated/contacts/contacts.client'
import { contactsQueryKeys } from '../../../shared/api/generated/contacts/contacts.query-keys'
import type {
  CreateContactRequest,
  CreateContactResponse,
} from '../../../shared/api/generated/contacts/contacts.types'

export function useCreateContactMutation(): {
  mutate: (payload: CreateContactRequest) => Promise<CreateContactResponse>
  invalidate: () => ReturnType<typeof contactsQueryKeys.list>
} {
  return {
    mutate: (payload: CreateContactRequest) => contactsClient.createContact(payload),
    invalidate: () => contactsQueryKeys.list(),
  }
}
