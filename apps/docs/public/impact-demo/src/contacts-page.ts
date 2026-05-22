import { contactsClient } from './generated/contacts'

export async function saveContact(payload: unknown) {
  return contactsClient.createContact(payload)
}

export async function searchContacts(query: string) {
  return contactsClient.searchContacts({ query })
}
