// @archora-forge-generated
// @archora-forge-meta {"version":"1.1.0","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
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
