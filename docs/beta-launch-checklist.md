# Beta Launch Checklist

Repository:

- confirm README preview wording and limitations;
- enable GitHub Pages from Actions;
- add repository topics: `openapi`, `vue`, `typescript`, `codegen`, `frontend`;
- verify issue templates and PR template render correctly;
- run `pnpm release:check`;
- inspect `pnpm pack` tarball contents;
- create a signed preview tag only after approval.

Release:

- draft GitHub release notes from `docs/releases/v0.2.0-preview.md`;
- do not publish npm packages without explicit confirmation;
- include known gaps in the release description.

Feedback:

- link `docs/beta-feedback.md`;
- ask users for OpenAPI snippets and CLI output;
- avoid promising production stability or full OpenAPI coverage.

LinkedIn draft:

> Archora Forge is preparing for public preview: a local-first OpenAPI to typed Vue frontend module scaffold generator. It creates clients, query helpers, schema-driven form/table scaffolds, pages, mocks and diagnostics from one contract. Preview scope is intentionally narrow; feedback on real OpenAPI contracts is welcome.
