import type { ContactId, ContactsListParams } from './contacts.types'

export const contactsQueryKeys = {
  all: ['contacts'] as const,
  list: (params?: ContactsListParams) => [...contactsQueryKeys.all, 'list', params] as const,
  detail: (id: ContactId) => [...contactsQueryKeys.all, 'detail', id] as const,
} as const
