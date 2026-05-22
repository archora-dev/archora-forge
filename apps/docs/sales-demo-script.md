# Sales Demo Script

7-10 minute script for a public preview or paid private beta sales call.

## Setup

Open these before the call:

- `examples/public-crm/openapi.yaml`
- `examples/public-crm/archora-forge.config.ts`
- `examples/public-crm/generated/src/shared/api/generated`
- `examples/public-crm/generated/src/features`
- `examples/public-crm/generated/src/shared/mocks`
- an HTML check report produced with `archora-forge check --report html`
- a generated-output typecheck terminal or report, when available

Use the public CRM demo only. Do not open private schemas, customer screenshots or generated private output on a recorded call unless the customer has explicitly approved it.

## 0:00-1:00 - Problem

Most OpenAPI generators stop at a typed client. That is useful, but frontend teams still need to build the resource layer around it: query keys, operation helpers, form fields, table columns, permissions, labels, mocks and drift checks.

Archora Forge starts from the same OpenAPI contract, but the output is closer to the frontend boundary a Vue and TypeScript team actually maintains. It is local-first, so private schemas can stay inside the customer's repo or CI.

## 1:00-2:00 - Show The Public Schema

Open `examples/public-crm/openapi.yaml`.

Point out the schema is fictional and safe to share. It has:

- CRUD resources: `contacts`, `companies`
- Search: `GET /search`
- Dashboard/read-only endpoint: `GET /dashboard/summary`
- Action operation: `POST /contacts/{contactId}/archive`
- File/binary diagnostic: `GET /files/{fileId}/download`
- Error responses, pagination, enums, nullable fields and typed payload schemas

Set expectation: this is a neutral demo contract, not a claim that every private schema will generate cleanly on the first run.

## 2:00-3:00 - Inspect, Lint And Check

Run or show:

```bash
node packages/cli/dist/index.js inspect examples/public-crm/openapi.yaml --json
node packages/cli/dist/index.js lint examples/public-crm/openapi.yaml
(cd examples/public-crm && node ../../packages/cli/dist/index.js check ./openapi.yaml --config ./archora-forge.config.ts --report markdown)
```

Callouts:

- `inspect` explains what Forge detected before code generation.
- `lint` scores frontend readiness and reports schema issues.
- `check` detects generated-output drift and can fail CI with a minimum health score.

Expected public CRM result: 6 resources, health score 100, 0 diagnostics and no drift after generation.

## 3:00-4:30 - Generated Clients, Types And Query Keys

Open:

- `examples/public-crm/generated/src/shared/api/generated/components.types.ts`
- `examples/public-crm/generated/src/shared/api/generated/contacts/contacts.types.ts`
- `examples/public-crm/generated/src/shared/api/generated/contacts/contacts.client.ts`
- `examples/public-crm/generated/src/shared/api/generated/contacts/contacts.query-keys.ts`

Explain that Forge emits stable TypeScript contracts that can be wrapped by the customer's Vue composables, Pinia stores, TanStack Query usage or internal resource layer.

Show the client surface:

```ts
contactsClient.listContacts(params)
contactsClient.getContact(params)
contactsClient.createContact(payload)
contactsClient.updateContact(params, payload)
contactsClient.deleteContact(params)
```

The important claim is not page generation. The claim is deterministic frontend resource scaffolding from the API contract.

## 4:30-5:30 - Operation Helpers

Open:

- `examples/public-crm/generated/src/features/contacts/api/useContactsQuery.ts`
- `examples/public-crm/generated/src/features/contacts/api/useCreateContactMutation.ts`
- `examples/public-crm/generated/src/features/contactsArchive/api/useArchiveContactMutation.ts`
- `examples/public-crm/generated/src/features/filesDownload/api/useDownloadFileQuery.ts`

Explain that the feature layer provides operation-oriented helpers with typed inputs and outputs. These are intentionally thin so the customer can adapt them to their query library and app conventions.

Note the preview limitation: first-party Vue/TanStack adapters are integration patterns today, not a finished universal adapter.

## 5:30-6:30 - Form And Table Metadata

Open:

- `examples/public-crm/generated/src/features/contacts/model/contacts.config.ts`
- `examples/public-crm/generated/src/features/search/model/search.config.ts`
- `examples/public-crm/generated/src/features/dashboardSummary/model/dashboardSummary.config.ts`

Show:

- `fields` for forms
- `filters` for list/search controls
- `columns` for table/resource views
- pagination metadata
- enum-to-select and date/email/number hints

Position this as the part standard OpenAPI clients do not usually give frontend teams.

## 6:30-7:30 - Permissions, I18n And Mocks

Open:

- `examples/public-crm/generated/src/features/contacts/model/contacts.permissions.ts`
- `examples/public-crm/generated/src/features/contacts/model/contacts.i18n.ts`
- `examples/public-crm/generated/src/shared/mocks/contacts/contacts.handlers.ts`
- `examples/public-crm/generated/src/shared/mocks/contacts/contacts.scenarios.ts`

Explain:

- permissions provide stable policy keys for app-level guards;
- i18n output gives labels and action text to customize;
- mocks give frontend teams a generated starting point for local development and tests.

Keep claims modest: these are scaffolds, not a replacement for the customer's real auth, design system or domain fixtures.

## 7:30-8:30 - HTML Report And Typecheck

Open the HTML check report.

Explain the report flow:

```bash
node ../../packages/cli/dist/index.js check ./openapi.yaml \
  --config ./archora-forge.config.ts \
  --report html \
  --report-file ./forge-check.html
```

Use it to show health, drift and diagnostics in a format that can be attached to an internal readiness review.

Then show the generated-output typecheck gate:

```bash
tsc --noEmit -p ./generated-output-typecheck/tsconfig.json
```

Explain that a paid pilot should not stop at "the generator ran". It should prove that the emitted TypeScript compiles in a customer-shaped workspace, or document the exact schema/generator issue that blocks compilation.

## 8:30-9:30 - Privacy And Paid Pilot Positioning

Explain the local-first workflow:

- the customer runs Forge locally or in their CI;
- private schemas do not need to be uploaded to Archora;
- generated private output should stay out of public issues, emails and screenshots;
- the pilot can work from redacted command outputs and reports.

Explain preview limitations:

- not production-ready;
- not full OpenAPI coverage;
- no generated Vue pages or routes;
- customer owns design-system integration;
- private schema results depend on schema quality and conventions.

## 9:30-10:00 - Paid Pilot Offer

Close with a bounded offer:

The paid private beta pilot is a short implementation and risk-reduction package. We run Forge against 1-3 real schemas or one tightly related schema family in a temporary local workspace, review diagnostics, produce generated TypeScript output, typecheck that output, create CI drift/readiness reports and identify what integration work remains for the customer's Vue frontend.

The outcome is an evidence-based go/no-go decision for broader adoption, not a production-ready rollout promise.
