# Launch Readiness Handoff

## 1. What Is Ready

- Public CRM demo now shows the full Forge thesis: CRUD resources, search resource, action operation, dashboard/read-only endpoint, file/binary endpoint, permissions, i18n, mocks, check/drift workflow and HTML report flow.
- Sales and pilot materials are drafted for public preview, paid private beta and paid pilot conversations.
- Verification passed after the operation model fixes and public CRM regeneration.
- Git commit, push, merge, tag, release and npm publish have not been performed.

## 2. Operation Model Changes

- Search-like endpoints are classified as `search-resource` for `GET` and `POST` when path, operationId, summary or tags indicate search/find/query/filter intent.
- Normal collection list endpoints remain `crud-resource`.
- Identity-detail endpoints such as `GET /search/{id}` are not forced into search-resource classification.
- Subresource write endpoints such as archive/approve/confirm/cancel style operations are classified as `action-operation`.
- Local `#/components/parameters/*` references are resolved before generation so action helpers receive path params.

## 3. Public CRM Demo

Detected resources:

- `contacts` - `crud-resource`
- `contactsArchive` - `action-operation`
- `companies` - `crud-resource`
- `search` - `search-resource`
- `dashboardSummary` - `dashboard-resource`
- `filesDownload` - `file-operation`

Key generated demo files:

- `examples/public-crm/generated/src/shared/api/generated/contacts/contacts.client.ts`
- `examples/public-crm/generated/src/shared/api/generated/search/search.client.ts`
- `examples/public-crm/generated/src/shared/api/generated/contactsArchive/contactsArchive.client.ts`
- `examples/public-crm/generated/src/features/search/api/useSearchWorkspaceQuery.ts`
- `examples/public-crm/generated/src/features/contactsArchive/api/useArchiveContactMutation.ts`
- `examples/public-crm/generated/src/features/*/model/*.config.ts`
- `examples/public-crm/generated/src/features/*/model/*.permissions.ts`
- `examples/public-crm/generated/src/features/*/model/*.i18n.ts`
- `examples/public-crm/generated/src/shared/mocks/*`

## 4. Sales And Pilot Docs

- `apps/docs/sales-demo-script.md`
- `apps/docs/private-schema-intake-checklist.md`
- `apps/docs/paid-pilot-one-pager.md`
- `apps/docs/outreach-messages.md`
- `apps/docs/public-demo-walkthrough.md`
- `apps/docs/launch-readiness-handoff.md`

## 5. Commands Passed

- `pnpm release:check`
- `pnpm build:docs`
- `pnpm --filter public-crm-demo typecheck`
- `node packages/cli/dist/index.js inspect examples/public-crm/openapi.yaml --json`
- `node packages/cli/dist/index.js lint examples/public-crm/openapi.yaml`
- `node ../../packages/cli/dist/index.js check ./openapi.yaml --config ./archora-forge.config.ts --report markdown`

## 6. Known Limitations

- Public preview/private beta only; not production-ready.
- No full OpenAPI coverage claim.
- No generated Vue pages, routes or complete application screens.
- No full auth framework or full transport framework.
- Discriminator-heavy polymorphism remains diagnostic/limited.
- Framework-neutral generated output can be adapted by consumers, but first-party framework adapters are not complete product support.
- The generator does not currently delete obsolete generated files automatically; stale demo artifacts were removed manually.
- Local parameter reference resolution covers local `#/components/parameters/*`, not external refs.
- Real-world fixtures were sanitized into domain-neutral synthetic schemas: project-specific names and personal-data-shaped field names were replaced with neutral identifiers.

## 7. What Not To Claim

- Production-ready.
- Full OpenAPI support.
- Complete application generation.
- Full UI generation.
- Full auth, transport or routing framework.
- Complete discriminator/polymorphism support.
- First-party React or Angular support.
- That private schemas can be uploaded safely to public issues, public email or public chat.

## 8. What Can Be Claimed

- Public preview and paid private beta readiness.
- Local-first OpenAPI to TypeScript frontend resource-layer generation.
- Typed clients, operation helpers, query keys, form/table metadata, permissions, i18n labels and mocks.
- CI/readiness check flow with inspect, lint and check.
- Public CRM demo covers CRUD, search, action, dashboard/read-only and file/binary operation shapes.
- Private schema pilots can run in customer-controlled local or CI environments without required schema upload.

## 9. Check Before Commit/Merge

- Re-run `git status --short`.
- Confirm ignored local files are not staged: `examples/public-crm/forge-check.html` and `examples/public-crm/node_modules`.
- Confirm old generated archive artifacts are deleted and new `contactsArchive` artifacts are included.
- Confirm no stale `useSearchesQuery.ts` remains.
- Confirm no literal `/contacts/{contactId}/archive` remains in generated clients.
- Review framework wording around React Query and Angular services so it reads as possible framework-neutral binding examples, not current first-party support.
- Confirm real-world fixtures remain domain-neutral with the public-safety grep before commit/merge.
- Re-run `pnpm release:check` immediately before commit/merge.

## 10. Suggested Commits

1. Operation model fix:
   - `packages/core/src/openapi/normalizeOpenApi.ts`
   - `packages/core/src/openapi/openapi.types.ts`
   - `test/operation-model-hardening.test.ts`
   - `test/typed-output.test.ts`
   - `test/curated-real-world-fixtures.test.ts`
   - sanitized fixture renames/content if accepted

2. Public CRM demo refresh:
   - deleted old archive generated files
   - added `contactsArchive` generated files
   - updated search generated files
   - `apps/docs/public-demo-walkthrough.md`

3. Sales and launch docs:
   - `apps/docs/sales-demo-script.md`
   - `apps/docs/private-schema-intake-checklist.md`
   - `apps/docs/paid-pilot-one-pager.md`
   - `apps/docs/outreach-messages.md`
   - `apps/docs/launch-readiness-handoff.md`
