# Public CRM Demo Walkthrough

The public CRM demo is a neutral OpenAPI contract for previewing Forge without private schemas or generated customer output.

Demo files:

- `examples/public-crm/openapi.yaml`
- `examples/public-crm/archora-forge.config.ts`
- `examples/public-crm/generated`
- `examples/public-crm/forge-check.html`

## Contract Shape

The schema includes the operation shapes frontend teams usually need to evaluate:

- CRUD resources: contacts and companies.
- Search resource: `GET /search`.
- Read-only dashboard endpoint: `GET /dashboard/summary`.
- Action operation: `POST /contacts/{contactId}/archive`.
- File/binary operation: `GET /files/{fileId}/download`.

The schema is intentionally fictional. It does not include private names, customer data, screenshots or generated private output.

## Run the Demo

From the repository root:

```bash
pnpm exec archora-forge demo --out forge-demo
```

The command creates `openapi.old.yaml`, `openapi.yaml`, a small `src/` usage example and reports under `forge-demo/report/`.

For the committed Public CRM example, run:

```bash
pnpm build
node packages/cli/dist/index.js inspect --config examples/public-crm/archora-forge.config.ts
node packages/cli/dist/index.js lint --config examples/public-crm/archora-forge.config.ts --strict
node packages/cli/dist/index.js generate --config examples/public-crm/archora-forge.config.ts --dry-run
node packages/cli/dist/index.js check --config examples/public-crm/archora-forge.config.ts --report html --report-file examples/public-crm/forge-check.html
node packages/cli/dist/index.js check --config examples/public-crm/archora-forge.config.ts --report markdown --report-file examples/public-crm/forge-check.md
node packages/cli/dist/index.js audit --config examples/public-crm/archora-forge.config.ts --out /tmp/archora-forge-public-audit
```

Current demo check result:

- 6 detected resources.
- 93 generated files after a clean generation run.
- 0 diagnostics.
- 0 drift after generation.
- Health score 100.
- Generated TypeScript typecheck passed in the audit package.

For a buyer-facing package, pair this walkthrough with [Product Demo Package](/product-demo-package), [Generated Output Typecheck](/generated-output-typecheck) and [License and Paid Pilot](/self-serve-purchase).

## What Forge Generates

The committed demo output shows the generated frontend resource layer:

```txt
examples/public-crm/generated/src/
  shared/api/generated/
    components.types.ts
    contacts/
      contacts.client.ts
      contacts.types.ts
      contacts.query-keys.ts
      index.ts
    contactsArchive/
      contactsArchive.client.ts
      contactsArchive.types.ts
  features/contacts/
    api/
      useContactsQuery.ts
      useContactQuery.ts
      useCreateContactMutation.ts
      useUpdateContactMutation.ts
      useDeleteContactMutation.ts
    model/
      contacts.config.ts
      contacts.permissions.ts
      contacts.i18n.ts
  features/contactsArchive/
    api/
      useArchiveContactMutation.ts
  shared/mocks/contacts/
    contacts.fixtures.ts
    contacts.handlers.ts
    contacts.scenarios.ts
```

For Vue teams, the important integration point is the generated TypeScript contract, not a generated Vue component. The app can wrap `contactsClient`, `contactsQueryKeys` and `contactsConfig` in Vue composables, Pinia stores, TanStack Query adapters, or an internal resource module.

Example generated client surface:

```ts
contactsClient.listContacts(params)
contactsClient.getContact(id)
contactsClient.createContact(payload)
contactsClient.updateContact(id, payload)
contactsClient.deleteContact(id)
```

Example generated metadata surface:

```ts
contactsConfig.fields
contactsConfig.filters
contactsConfig.columns
contactsConfig.pagination
```

## Preview Limits

This demo is for public preview and paid pilot evaluation. It is not a production-readiness claim.

Known limits still apply:

- Forge does not generate Vue pages or design-system components.
- Zod and Valibot generation are experimental opt-in modes.
- TanStack-style usage is an integration pattern, not a finished first-party adapter.
- Discriminator-heavy polymorphism and full OpenAPI serialization coverage are not claimed.
- Private schema adoption should start with a branch, generated diff review and CI drift check.
