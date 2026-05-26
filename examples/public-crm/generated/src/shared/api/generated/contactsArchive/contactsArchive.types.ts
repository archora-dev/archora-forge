// @archora-forge-generated
// @archora-forge-meta {"version":"1.2.1","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
import type { ArchiveContactRequest, Contact } from '../components.types'

export type { ArchiveContactRequest, Contact } from '../components.types'

export interface ContactsArchive {
  [key: string]: unknown
}

export type ContactsArchiveId = string

export type ContactsArchiveDetailResponse = ContactsArchive

export type ContactsArchivesListParams = Record<string, never>

export type ContactsArchivesListResponse = unknown

export type CreateContactsArchiveRequest = Partial<ContactsArchive>

export type CreateContactsArchiveResponse = ContactsArchive

export type UpdateContactsArchiveRequest = Partial<ContactsArchive>

export type UpdateContactsArchiveResponse = ContactsArchive

export interface ArchiveContactOperationParams {
  contactId: string
}

export type ArchiveContactOperationRequest = ArchiveContactRequest

export type ArchiveContactOperationResponse = Contact
