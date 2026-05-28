# Launch Readiness Handoff

This handoff covers the Forge 1.3.0 release candidate.

## Scope

The release candidate focuses on the paid-pilot and PR-review workflow:

- PR impact comments with merge decision, merge risk, source usage and next actions;
- `check` and `audit` readiness gates with `pass`, `warn` and `fail` language;
- GitHub Actions generation with comment-only and block-merge modes;
- `pilot` package output with `pilot-report.md`, `impact-pr.md`, `impact.md`, `impact.json`, audit artifacts and `go-no-go.md`;
- public demo/proof artifacts refreshed from the current CLI;
- ugly OpenAPI fixture coverage for composition, auth, file transfer, nullable shapes, unsafe names and header parameters;
- paid pilot, team rollout, comparison and API stability docs.

## Version

- Previous published version: `1.2.2`.
- Release candidate version: `1.3.0`.
- Workspace package versions and `forgeCoreVersion` have been updated to `1.3.0`.
- Generated example metadata and public report metadata have been updated to `1.3.0`.

## Required Checks Before Commit

Run these after the final file review:

```bash
pnpm release:check
```

In `archora-site`:

```bash
pnpm verify
```

These commands create build output. Remove ignored build artifacts after verification if the workspace needs to stay clean before commit review.

## Release Notes

Use [Release 1.3.0](/releases/v1.3.0) as the release note source.

## Suggested Commits

Forge repository:

```text
Improve Forge pilot readiness and PR impact workflow
```

Site repository:

```text
Refresh Forge proof assets
```

## Files To Review

- `packages/cli/src/commands/check.command.ts`
- `packages/cli/src/commands/audit.command.ts`
- `packages/cli/src/commands/pilot.command.ts`
- `packages/cli/src/commands/demo.command.ts`
- `packages/cli/src/html-report.ts`
- `packages/core/src/version.ts`
- `test/product-regression.test.ts`
- `test/pilot-command.test.ts`
- `test/demo-command.test.ts`
- `test/ugly-openapi-fixtures.test.ts`
- `test/fixtures/openapi/ugly/`
- `apps/docs/releases/v1.3.0.md`
- `apps/docs/public/forge-demo/`
- `apps/docs/paid-pilot-package.md`
- `apps/docs/team-rollout-guide.md`
- `apps/docs/api-stability.md`
- `apps/docs/comparison.md`
- `apps/docs/competitive-positioning.md`
- `TEN_OUT_OF_TEN_ROADMAP.md`

## What Not To Claim

- Full OpenAPI coverage.
- Generated production pages or app screens.
- Hosted schema registry.
- First-party React or Angular support.
- Complete discriminator/polymorphism support.
- Production readiness for every schema without a pilot run.

## What Can Be Claimed

- Local-first TypeScript frontend resource contract generation from OpenAPI.
- PR impact review before merge.
- Source usage scan for affected generated API surface.
- CI gates with comment-only and block-merge modes.
- Pilot package artifacts for adoption review.
- Public demo/proof artifacts for no-private-data evaluation.
- Documented limitations and unsupported cases.
