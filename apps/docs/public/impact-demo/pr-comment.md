## Frontend API Impact

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

## Source Usage

- `src/contacts-page.ts:1,4,7,8`: contactsClient, createContact, searchContacts
