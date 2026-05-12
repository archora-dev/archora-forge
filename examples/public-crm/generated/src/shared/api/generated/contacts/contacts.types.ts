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
