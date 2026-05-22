# Frontend API Impact

Decision: blocked
Merge risk: high
Reason: 6 breaking frontend contract changes detected.

## Summary

- Breaking: 6
- Warnings: 0
- Non-breaking: 1
- Affected resources: contacts
- Affected generated files: 3

## PR Summary

Frontend API impact: blocked (high risk).
6 breaking frontend contract changes detected.
Changes: 6 breaking, 0 warnings, 1 non-breaking.
Affected resources: contacts.
Affected generated files: 3.
Migration hints:
- contacts: replace usages before regenerating. GET /contacts/{id} was removed.
- contacts: remove UI options and branch handling for the removed enum value. Enum value "blocked" was removed.
- contacts: update create/update payload builders and forms for the new required field. Field "ownerId" became required.
- contacts: remove reads, table columns and form bindings for the deleted field. Field "displayName" was removed.
- contacts: new endpoint is available after regeneration. POST /contacts/search was added.

## Migration Hints

- contacts: replace usages before regenerating. GET /contacts/{id} was removed.
- contacts: remove UI options and branch handling for the removed enum value. Enum value "blocked" was removed.
- contacts: update create/update payload builders and forms for the new required field. Field "ownerId" became required.
- contacts: remove reads, table columns and form bindings for the deleted field. Field "displayName" was removed.
- contacts: new endpoint is available after regeneration. POST /contacts/search was added.

## Changes

- breaking removed-endpoint: GET /contacts/{id} was removed. (GET /contacts/{id})
- breaking enum-value-removed: Enum value "blocked" was removed. (POST /contacts request.status)
- breaking required-field-added: Field "ownerId" became required. (POST /contacts request.ownerId)
- breaking field-removed: Field "displayName" was removed. (POST /contacts response.displayName)
- breaking enum-value-removed: Enum value "blocked" was removed. (POST /contacts response.status)
- breaking required-field-added: Field "ownerId" became required. (POST /contacts response.ownerId)
- non-breaking added-endpoint: POST /contacts/search was added. (POST /contacts/search)

## Impacted Surface

- Operation IDs: createContact, getContact, searchContacts
- Client methods: createContact(), getContact(), searchContacts()
- Query hooks: useCreateContactMutation, useGetContactQuery, useSearchContactsQuery

## Source Usage

- `contacts-page.ts:1,4,7,8`: contactsClient, createContact, searchContacts
