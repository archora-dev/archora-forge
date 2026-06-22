# Why Forge

Archora Forge is not a replacement for every OpenAPI generator. It targets the frontend impact review and resource layer that generic generators usually leave to teams.

Forge is positioned for local evaluation and bounded commercial adoption. Use it when the cost of hand-maintaining frontend resource contracts is high enough to justify a local-first generator, reports and generated-output typecheck gate.

## Compared with openapi-generator

`openapi-generator` is broad and mature. It can generate clients for many languages and frameworks.

Forge is narrower:

- TypeScript-first;
- local-first;
- frontend resource oriented;
- generated query keys, resource metadata, permissions, i18n and mocks;
- CI drift checks and schema readiness diagnostics.

Use `openapi-generator` when you need broad language support. Use Forge when the frontend contract around the client is the expensive repetitive part.

## Compared with Orval

Orval is strong for TypeScript clients and TanStack Query style workflows.

Forge focuses on a different layer:

- resource detection;
- schema-driven form/table metadata;
- generated mocks and permissions;
- HTML/JSON/Markdown reports;
- contract drift and frontend-readiness checks.

Use Orval when client/query generation is enough. Use Forge when frontend teams need PR impact review, source usage scanning and a committed resource contract that also informs UI metadata and CI.

First-party TanStack Query and Vue Query adapters generate real `useQuery`/`useMutation` hooks via `target.query`, on top of the emitted clients and query keys. Other frameworks remain consumer-owned wrappers around the generated operation helpers.

## What Forge Generates

- typed clients;
- operation helpers;
- query keys;
- TypeScript schema types;
- schema-derived form/table metadata;
- permissions constants;
- i18n label scaffolds;
- mock fixtures, handlers and scenarios;
- JSON, Markdown and HTML reports.

## What Forge Does Not Generate

- application pages;
- framework components;
- design-system components;
- OAuth token acquisition;
- a hosted registry;
- custom business workflows.

The consuming application owns UI, state management and runtime auth policy.

## Purchase Fit

Forge is a strong purchase candidate when a Vue/OpenAPI team wants to answer:

- what resource layer would be generated from a real schema;
- which schema issues block better frontend generation;
- whether CI drift checks catch contract changes early;
- how generated metadata maps into the team's table, form and permission conventions.

The intended purchase path is artifact-led: run the demo, evaluate one private schema locally, typecheck generated output, fill the report and request a bounded license scope when the artifacts justify it.
