# Roadmap

This roadmap describes how Archora Forge will move from public preview and private beta pilots toward broader production adoption.

It is a planning document, not a release promise. Scope and order may change when real pilot schemas expose higher-priority gaps.

## Current Position

Archora Forge is a local-first OpenAPI to TypeScript frontend resource-layer generator.

The current preview is suitable for evaluation and paid private beta pilots where the goal is to test one real schema or schema family in a controlled branch or CI environment.

Forge does not currently claim:

- production-ready status;
- full OpenAPI coverage;
- complete application generation;
- generated framework pages or routes;
- first-party support for every frontend framework;
- ownership of application auth, business workflow or UI behavior.

## Product Direction

Forge will stay focused on the frontend resource layer around an OpenAPI contract:

- typed clients;
- operation helpers;
- query keys;
- schema-derived metadata for forms and tables;
- permissions and i18n scaffolds;
- mocks;
- diagnostics;
- drift and readiness reports;
- safe regeneration workflows.

The project will avoid becoming a broad application generator. The consuming application should continue to own routing, state management, auth policy, design-system components and product-specific workflows.

## Development Phases

### Phase 1: Pilot Reliability

Status: in progress.

Goal: make Forge dependable enough for short, bounded private schema pilots.

Completed work:

- local and remote OpenAPI loading;
- resource detection for CRUD, search, action, dashboard/read-only and file operations;
- typed clients and operation helpers;
- query keys;
- generated resource metadata;
- permissions and i18n scaffolds;
- mock fixtures, handlers and scenarios;
- schema diagnostics and frontend readiness scoring;
- `inspect`, `lint`, `diff`, `generate`, `check` and `doctor` commands;
- JSON, Markdown and HTML reporting;
- pilot readiness summary in `check`;
- safe generated-file ownership marker;
- stale generated-file preview and explicit prune flow;
- generator metadata alignment checks for Forge version, schema hash and config hash;
- public CRM, petstore and mini ecommerce examples.

Next work:

- tighten CI adoption docs and reusable workflow examples;
- improve final pilot report format;
- expand schema coverage reporting;
- document accepted limitations per pilot.

Exit criteria:

- a new evaluator can run Forge against a private schema without sharing the schema publicly;
- reports clearly show drift, diagnostics, generator metadata status and next actions;
- stale generated files can be reviewed and pruned safely;
- pilot output can be reviewed in a normal pull request.

### Phase 2: CI Adoption

Goal: make Forge easy to install as a repeatable check in customer repositories.

Planned features:

- GitHub Actions example with strict and advisory modes;
- CI artifact guidance for JSON, Markdown and HTML reports;
- documented exit-code policy for `validate`, `lint`, `diff`, `check` and `generate --dry-run`;
- recommended pull-request workflow for generated files;
- example branch policy for drift and schema-health gates;
- command recipes for private schemas, remote schemas and multi-schema workspaces.

Expected output:

- `apps/docs/ci.md` expanded into a complete adoption guide;
- copy-ready workflow snippets;
- a short checklist for adding Forge to an existing frontend repo;
- stronger smoke coverage for external consumer installs.

Exit criteria:

- a team can add Forge to CI without a custom onboarding call;
- generated reports are useful as PR artifacts;
- failed checks explain whether the problem is drift, schema quality, config, generator metadata or environment setup.

### Phase 3: Adoption Reports

Goal: turn `check` output into a clear technical handoff artifact for pilots.

Planned features:

- adoption-oriented Markdown and HTML report layout;
- summary of detected resources and operation categories;
- schema health and diagnostics summary;
- generated file count by output area;
- drift summary;
- generator metadata summary;
- stale prune candidate summary;
- explicit blockers, warnings and next actions;
- appendix with command versions and config paths.

Expected output:

- a report that can be attached to a pilot handoff or internal architecture review;
- fewer manual notes after running a private schema evaluation;
- clearer go/no-go language for private beta adoption.

Exit criteria:

- the report can stand alone for a technical stakeholder who did not run the CLI;
- known limitations and accepted risks are visible;
- next actions are concrete enough to assign.

### Phase 4: Schema Coverage Matrix

Goal: make OpenAPI support boundaries measurable and visible.

Planned features:

- coverage summary by operation type;
- coverage summary by request and response shape;
- detection of unsupported or partially supported OpenAPI constructs;
- counts for generated, skipped, fallback and diagnostic-only cases;
- stricter reporting for discriminator-heavy polymorphism;
- clearer `allOf`, `oneOf` and `anyOf` handling notes;
- fixture expansion based on real pilot patterns after sanitization.

Expected output:

- a coverage section in reports;
- docs that explain what Forge supports without overclaiming;
- better prioritization for generator improvements.

Exit criteria:

- evaluators can see which parts of a schema are strong fits;
- unsupported shapes are visible before generated output is adopted;
- support claims are backed by tests and fixtures.

### Phase 5: Framework Integration Patterns

Goal: make generated resource contracts easier to connect to real frontend stacks while keeping the core generator framework-neutral.

Planned features:

- documented Vue usage patterns;
- documented TanStack Query integration pattern;
- examples for wrapping generated clients in application services;
- UI-kit adapter examples for table and form metadata;
- clearer separation between generated contract, app-owned state and app-owned UI.

Possible later packages:

- first-party adapter package for common query integration;
- first-party adapter package for metadata-to-UI-kit mapping;
- framework-specific examples that do not change the core generator contract.

Exit criteria:

- teams can integrate generated output without treating Forge as a page generator;
- examples show real usage boundaries;
- adapter work remains optional and does not expand core scope unnecessarily.

### Phase 6: Runtime Hardening

Goal: keep the generated client layer predictable in real applications.

Planned features:

- clearer runtime error envelope docs;
- examples for auth token injection and refresh ownership;
- stronger timeout, abort and body-handling tests;
- recipes for API key, bearer token and custom header policies;
- documented guidance for app-owned retry behavior.

Out of scope for this phase:

- becoming a full auth framework;
- storing secrets;
- owning OAuth flows;
- replacing application HTTP policy.

Exit criteria:

- runtime behavior is stable and documented;
- generated clients remain small and inspectable;
- application-owned auth and retry policies are easy to attach.

### Phase 7: Release Discipline

Goal: make public releases predictable.

Planned features:

- release checklist;
- changelog discipline;
- upgrade notes for generated-file contract changes;
- package verification before publish;
- compatibility notes for v1 generated layout;
- migration notes when metadata, output structure or config behavior changes.

Exit criteria:

- every release has tested packages, documented changes and upgrade notes;
- generated-file contract changes are explicit;
- consumers can decide whether an update is safe for their branch.

## Near-Term Backlog

Priority order for the next implementation slices:

1. CI Adoption Kit v1.
2. Adoption Report v1.
3. Schema Coverage Matrix v1.
4. Framework Integration Patterns v1.
5. Runtime Hardening v1.
6. Release Checklist and Upgrade Notes v1.

## Feature Candidates

These are useful candidates, but they should be pulled only when pilot evidence supports them:

- stricter schema lint rules for frontend generation quality;
- richer operation grouping for non-CRUD APIs;
- better binary upload and download examples;
- partial support for safer discriminator patterns;
- generated mock scenario variants;
- report comparison between two schema versions;
- generated changelog for resource contract changes;
- config presets for common repository layouts;
- workspace-level report for multi-schema projects.

## Non-Goals

The following areas are intentionally not on the roadmap for the core generator:

- generating full applications;
- generating production UI screens;
- replacing design systems;
- owning application routing;
- owning application state management;
- owning OAuth or session flows;
- becoming a general-purpose OpenAPI generator for every language;
- hosting or collecting private OpenAPI schemas.

## Decision Rules

Roadmap items should be accepted when they meet at least one of these conditions:

- they reduce adoption risk for private schema pilots;
- they make generated output safer to commit, review, update or remove;
- they improve report quality for technical decision-making;
- they clarify support boundaries;
- they preserve the framework-neutral resource-layer contract.

Roadmap items should be rejected or delayed when they:

- require Forge to own application-specific behavior;
- blur the line between resource contract generation and full app generation;
- add broad framework commitments without pilot evidence;
- make generated output harder to inspect;
- weaken local-first private schema handling.

## Current Success Metric

The main near-term success metric is not download volume. It is the number of private schema evaluations where Forge produces a clear technical answer:

- what can be generated safely;
- what needs schema cleanup;
- what should stay application-owned;
- whether CI drift and readiness checks are useful for that team;
- what work remains before broader adoption.

