// @archora-forge-generated
// @archora-forge-meta {"version":"1.1.0","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
import type {
  Contact,
  ContactCreatePayload,
  ContactPage,
  ContactStatus,
  ContactUpdatePayload,
} from '../components.types'

export type {
  Contact,
  ContactCreatePayload,
  ContactPage,
  ContactStatus,
  ContactUpdatePayload,
} from '../components.types'

export type ContactId = string

export type ContactDetailResponse = Contact

export interface ContactsListParams {
  page?: number
  pageSize?: number
  status?: ContactStatus
  companyId?: string
}

export type ContactsListResponse = ContactPage

export type CreateContactRequest = ContactCreatePayload

export type CreateContactResponse = Contact

export type UpdateContactRequest = ContactUpdatePayload

export type UpdateContactResponse = Contact
