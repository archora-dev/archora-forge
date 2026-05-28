# Team Rollout Guide

Use this path when a frontend team wants Forge in the first pull request without a custom onboarding call.

## 1. Trial Branch

Create a short-lived branch in the consuming frontend repository.

```bash
pnpm add -D @archora/forge-cli @archora/forge-adapters
pnpm exec archora-forge demo --out forge-demo
pnpm exec archora-forge init --input ./openapi.yaml
pnpm exec archora-forge doctor ./openapi.yaml
pnpm exec archora-forge inspect ./openapi.yaml
```

Read `forge-demo/report/README.md` before touching the private schema. It shows the artifact order the team should expect.

## 2. First API Change Review

Run impact before regeneration:

```bash
pnpm exec archora-forge impact ./openapi.yaml \
  --base origin/main \
  --repo . \
  --report markdown \
  --report-file forge-impact.md \
  --pr-comment-file forge-impact-pr.md
```

The reviewer reads `forge-impact-pr.md` first. It should answer:

- whether the change blocks merge;
- which resources and generated files are affected;
- which source files already use the impacted API surface;
- what the frontend team should do next.

## 3. Advisory CI

Start with comment-only mode:

```bash
pnpm exec archora-forge ci init github \
  --schema ./openapi.yaml \
  --base origin/main \
  --mode impact \
  --gate comment
```

Open one pull request with the workflow. Confirm that Forge posts the PR comment and uploads artifacts without blocking merge.

## 4. Blocked Merge Gate

Switch to blocking mode after the team agrees that blocked frontend API impact should stop merge:

```bash
pnpm exec archora-forge ci init github \
  --schema ./openapi.yaml \
  --base origin/main \
  --mode impact \
  --gate block \
  --force
```

Blocking mode keeps the same PR comment and artifacts. The final workflow step fails only after Forge has written the evidence.

## 5. Pilot Package

For the adoption decision, create the one-folder package:

```bash
pnpm exec archora-forge pilot ./openapi.yaml \
  --base origin/main \
  --repo . \
  --out forge-pilot
```

Review these files in order:

- `forge-pilot/pilot-report.md`;
- `forge-pilot/impact-pr.md`;
- `forge-pilot/audit/index.html`;
- `forge-pilot/go-no-go.md`.

## 6. Adoption Decision

Adopt Forge for the first schema only when:

- the PR comment saves reviewer time;
- blocked impact is clear enough to act on;
- generated TypeScript fits the repository layout;
- diagnostics identify schema or integration work without guesswork;
- the team knows who owns API fixes, frontend fixes and CI policy.

Keep the rollout bounded. Add a second schema only after the first schema has passed the PR workflow and the generated output review.
