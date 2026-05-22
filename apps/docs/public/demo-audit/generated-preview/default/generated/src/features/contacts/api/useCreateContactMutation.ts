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
