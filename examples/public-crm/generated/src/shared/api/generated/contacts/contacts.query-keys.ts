// @archora-forge-generated
// @archora-forge-meta {"version":"1.3.0","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
import type { ContactId, ContactsListParams } from './contacts.types'

export const contactsQueryKeys = {
  all: ['contacts'] as const,
  list: (params?: ContactsListParams) => [...contactsQueryKeys.all, 'list', params] as const,
  detail: (id: ContactId) => [...contactsQueryKeys.all, 'detail', id] as const,
} as const
