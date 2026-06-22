# First User Walkthrough

Run this exactly as an external user would. It proves the published package can be installed, opened, and used to request access without the local monorepo.

## Fresh Install

```bash
mkdir forge-first-run
cd forge-first-run
npm init -y
npm install -D @archora/forge-cli
npx archora-forge --version
```

Expected result:

```txt
archora-forge/2.1.0
```

## Demo Before Private Schema

```bash
npx archora-forge demo --out forge-demo
```

Open these files:

- `forge-demo/report/README.md`;
- `forge-demo/report/check.html`;
- `forge-demo/report/audit/index.html`;
- `forge-demo/report/impact.md`;
- `forge-demo/report/impact-pr.md`;
- `forge-demo/report/go-no-go.md`.

The demo should show the product loop without asking for private data.

## Request A Trial Or Pilot

```bash
npx archora-forge license request --plan pilot --out license-request.md
```

Send `license-request.md` to `akotov@archora.dev` or Telegram `@akotofff`.

## Evaluate On A Real Repo

From the frontend repository:

```bash
npm install -D @archora/forge-cli
npx archora-forge impact ./openapi.yaml --base origin/main --repo . --pr-comment-file .forge/impact-pr.md
npx archora-forge pilot ./openapi.yaml --base origin/main --repo . --out .forge/pilot
npx archora-forge ci init github --schema ./openapi.yaml --base origin/main --gate comment
```

If the API schema file does not exist on `origin/main`, use the two-file mode:

```bash
npx archora-forge impact ./openapi.old.yaml ./openapi.yaml --repo . --pr-comment-file .forge/impact-pr.md
npx archora-forge pilot ./openapi.yaml --old ./openapi.old.yaml --repo . --out .forge/pilot
```

## Decision

Continue only when the artifacts answer these questions:

- Which frontend resources and generated files are affected?
- Which source usages are affected?
- What would the PR comment say?
- Does `pilot-report.md` give a frontend lead enough context to approve, reject or scope the rollout?
- Does generated TypeScript match the repo conventions closely enough?
- Are diagnostics actionable?
- Can the workflow run in CI?
