## Frontend API Impact

Merge decision: block
Merge risk: high
Reason: 6 breaking frontend contract changes detected.

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

## Next Actions

- Do not merge until the breaking frontend contract changes are handled.
- Update impacted source usages before regenerating committed Forge output.
- Re-run `archora-forge impact` after the OpenAPI or frontend changes are updated.

## Source Usage

- `src/contacts-page.ts:1,4,7,8`: contactsClient, createContact, searchContacts
