import type { ContactsArchiveId, ContactsArchivesListParams } from './contactsArchive.types'

export const contactsArchiveQueryKeys = {
  all: ['contactsArchive'] as const,
  list: (params?: ContactsArchivesListParams) =>
    [...contactsArchiveQueryKeys.all, 'list', params] as const,
  detail: (id: ContactsArchiveId) => [...contactsArchiveQueryKeys.all, 'detail', id] as const,
} as const
