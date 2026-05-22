# Roadmap

This roadmap covers planned and active follow-up work. It does not promise release dates.

The order may change when private schema pilots expose higher-priority gaps. The product direction should stay stable: Forge remains focused on the frontend resource layer around an OpenAPI contract.

## Product Boundaries

Forge will continue to focus on:

- generated TypeScript resource contracts;
- generated clients and operation helpers;
- query keys and resource metadata;
- mocks and test fixtures;
- diagnostics and readiness checks;
- drift, upgrade and regeneration safety;
- reports that help teams make adoption decisions.

Forge should not become a full application generator. Routing, application state, auth policy, business workflows, design-system components and final UI should remain owned by the consuming application.

This boundary keeps generated output small enough to inspect, review and commit.

## 1. CI Adoption Kit

The next priority is making Forge easy to add to an existing repository without a custom onboarding session.

Planned work:

- add a practical GitHub Actions workflow;
- document strict and advisory CI modes;
- document exit-code behavior for `validate`, `lint`, `diff`, `check` and `generate --dry-run`;
- define which JSON, Markdown and HTML reports should be uploaded as CI artifacts;
- describe a pull-request workflow for generated files;
- add a short checklist for introducing Forge into an existing frontend repository;
- extend external consumer smoke coverage around CI-style usage.

The result should be clear enough for a team to wire Forge into CI, open a pull request and understand whether a failure came from drift, schema quality, config, generator metadata or environment setup.

## 2. Adoption Report

The current report flow should become a stronger handoff artifact for private schema pilots and internal technical reviews.

Planned work:

- create an adoption-oriented Markdown and HTML report layout;
- summarize detected resources and operation categories;
- show schema health, diagnostics and failed checks in one place;
- show generated file counts by output area;
- include drift status;
- include generator metadata status;
- include stale prune candidates;
- separate blockers, warnings and next actions;
- include command versions and config paths in an appendix.

The report should be readable by a technical stakeholder who did not run the CLI. It should answer whether the schema can move forward, what must be fixed, what risks are accepted and what work remains.

## 3. Schema Coverage Matrix

Forge needs a clearer way to show which parts of a schema are strongly supported, partially supported or diagnostic-only.

Planned work:

- report coverage by operation type;
- report coverage by request and response shape;
- count generated, skipped, fallback and diagnostic-only cases;
- make unsupported OpenAPI constructs visible before adoption;
- improve reporting for `allOf`, `oneOf`, `anyOf` and discriminator-heavy schemas;
- expand fixtures from sanitized pilot patterns;
- connect coverage data to readiness and adoption reports.

The goal is to make support boundaries measurable. A team should not have to infer coverage by reading generated files one by one.

## 4. Framework Integration Patterns

The core generator should remain framework-neutral, but teams need documented ways to connect generated output to real frontend stacks.

Planned work:

- document Vue usage patterns;
- document TanStack Query integration patterns;
- show how to wrap generated clients in application services;
- show how resource metadata maps into UI-kit tables and forms;
- document where Forge stops and application-owned code begins;
- add framework-specific examples only when they do not change the core generator contract.

Later adapter packages may be added for common query integration or metadata-to-UI-kit mapping, but only when pilot evidence justifies first-party maintenance.

## 5. Runtime Hardening

Generated clients should stay predictable in real applications while leaving application policy outside Forge.

Planned work:

- document runtime error behavior more clearly;
- add examples for auth token injection;
- add examples for API key, bearer token and custom header policies;
- strengthen timeout, abort and body-handling tests;
- document retry behavior as application-owned policy;
- keep runtime helpers small and inspectable.

Forge should not store secrets, own OAuth/session flows or become an auth framework.

## 6. Release Discipline

Before broader adoption, releases need a predictable process and clear upgrade notes.

Planned work:

- add a release checklist;
- maintain a changelog for public releases;
- document generated-file contract changes;
- add upgrade notes for metadata, output structure and config behavior changes;
- verify package contents before publishing;
- document compatibility expectations for the v1 generated layout.

A user should be able to read release notes and decide whether an upgrade is safe for their branch.

## 7. Completed Feature Candidates

These candidates have v1 surfaces:

- stricter schema lint rules for frontend generation quality;
- richer grouping for non-CRUD operations;
- stronger binary upload and download examples;
- safer discriminator support where schemas are predictable;
- multiple generated mock scenario variants;
- report comparison between two schema versions;
- generated changelog for resource contract changes;
- config presets for common repository layouts;
- workspace-level report for multi-schema projects.

Remaining work in this area is fixture expansion and behavior hardening from real pilot schemas, not roadmap discovery.

## Not Planned For Core

The following work is intentionally outside the core roadmap:

- full application generation;
- production UI screen generation;
- design-system replacement;
- application routing ownership;
- application state management ownership;
- OAuth or session-flow ownership;
- broad language support beyond the TypeScript frontend contract;
- hosted storage or collection of private OpenAPI schemas.

## Decision Rules

Add work to the roadmap when it:

- reduces adoption risk for private schema pilots;
- makes generated output safer to commit, review, update or remove;
- improves reports for technical decision-making;
- clarifies support boundaries;
- preserves the framework-neutral resource-layer contract.

Delay or reject work when it:

- requires Forge to own application-specific behavior;
- blurs the line between resource contract generation and full app generation;
- adds broad framework commitments without pilot evidence;
- makes generated output harder to inspect;
- weakens local-first handling of private schemas.

## Near-Term Order

The v1 adoption package now covers CI adoption, adoption reports, schema coverage, framework integration patterns, runtime hardening notes, release discipline and the feature candidates above. Current follow-up priority order:

1. Validate the CI adoption kit against private schema pilots.
2. Expand schema coverage matrix fixtures from sanitized pilot patterns.
3. Add framework-specific examples only where pilots show repeated integration work.
4. Tighten runtime tests when real application transport edge cases appear.
5. Keep release notes current for generated-file contract changes.

