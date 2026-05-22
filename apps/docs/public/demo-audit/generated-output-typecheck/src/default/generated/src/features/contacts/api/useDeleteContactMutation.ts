import { contactsClient } from '../../../shared/api/generated/contacts/contacts.client'
import { contactsQueryKeys } from '../../../shared/api/generated/contacts/contacts.query-keys'
import type { ContactId } from '../../../shared/api/generated/contacts/contacts.types'

export function useDeleteContactMutation(): {
  mutate: (id: ContactId) => Promise<void>
  invalidate: () => ReturnType<typeof contactsQueryKeys.list>
} {
  return {
    mutate: (id) => contactsClient.deleteContact(id),
    invalidate: () => contactsQueryKeys.list(),
  }
}
