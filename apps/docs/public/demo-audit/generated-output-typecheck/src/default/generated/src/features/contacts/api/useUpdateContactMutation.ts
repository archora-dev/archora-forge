import { contactsClient } from '../../../shared/api/generated/contacts/contacts.client'
import { contactsQueryKeys } from '../../../shared/api/generated/contacts/contacts.query-keys'
import type {
  ContactId,
  UpdateContactRequest,
  UpdateContactResponse,
} from '../../../shared/api/generated/contacts/contacts.types'

export function useUpdateContactMutation(): {
  mutate: (input: {
    id: ContactId
    payload: UpdateContactRequest
  }) => Promise<UpdateContactResponse>
  invalidate: (id: ContactId) => ReturnType<typeof contactsQueryKeys.detail>
} {
  return {
    mutate: ({ id, payload }) => contactsClient.updateContact(id, payload),
    invalidate: (id) => contactsQueryKeys.detail(id),
  }
}
