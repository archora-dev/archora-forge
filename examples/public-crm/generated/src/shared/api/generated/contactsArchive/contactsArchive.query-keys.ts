// @archora-forge-generated
// @archora-forge-meta {"version":"1.1.0","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
import type { ContactsArchiveId, ContactsArchivesListParams } from './contactsArchive.types'

export const contactsArchiveQueryKeys = {
  all: ['contactsArchive'] as const,
  list: (params?: ContactsArchivesListParams) =>
    [...contactsArchiveQueryKeys.all, 'list', params] as const,
  detail: (id: ContactsArchiveId) => [...contactsArchiveQueryKeys.all, 'detail', id] as const,
} as const
