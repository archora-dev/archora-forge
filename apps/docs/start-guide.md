# Start Guide

Use this path when you open Archora Forge for the first time and want to understand, evaluate and run it without a call.

## 1. Understand The Product

Forge is a local-first OpenAPI impact review tool for frontend teams. It shows frontend risk before an API contract change lands and produces:

- typed resource output;
- API clients and operation helpers;
- query keys;
- form/table metadata;
- labels, permissions and mocks;
- audit reports;
- PR impact reports with repository usage scan;
- CI drift checks.

Forge does not generate production application screens. React, Vue, Angular, Svelte and internal UI kits stay consumer-owned.

## 2. See The Reports First

Start with the report pages before installing anything:

- [See Impact Report](./see-impact-report.md)
- [See Audit Report](./see-audit-report.md)
- [Product Demo Package](./product-demo-package.md)

These pages show what a buyer can inspect before making a purchase decision.

The public site also includes a PR impact sample with the exact comment artifact, source usage file and full report:

- `https://archora.dev/forge#pr-impact`
- `https://archora.dev/forge#proof-package`

## 3. Install And Check The CLI

```bash
pnpm add -D @archora/forge-cli @archora/forge-adapters
pnpm exec archora-forge --help
```

Inside this repository, use the built local CLI:

```bash
pnpm install
pnpm build
node packages/cli/dist/index.js --help
```

## 4. Run The Core Review

To see the workflow without preparing a project:

```bash
pnpm exec archora-forge demo --out forge-demo
```

Open `forge-demo/report/README.md`, then review `impact-pr.md`, `check.html`, `audit/index.html` and `go-no-go.md`.

For a pull request with an API change, start here:

```bash
pnpm exec archora-forge impact ./openapi.yaml \
  --base origin/main \
  --repo . \
  --report markdown \
  --report-file forge-impact.md \
  --pr-comment-file forge-impact-pr.md
```

For adoption of one current schema, generate the local audit package:

```bash
pnpm exec archora-forge audit ./openapi.yaml --out forge-audit
```

For a buyer-facing pilot package, combine both:

```bash
pnpm exec archora-forge pilot ./openapi.yaml --base origin/main --repo . --out forge-pilot
```

For the first pull request workflow:

```bash
pnpm exec archora-forge ci init github --schema ./openapi.yaml --base origin/main --mode impact --gate comment
pnpm exec archora-forge ci init github --schema ./openapi.yaml --base origin/main --mode impact --gate block --force
```

Start with `--gate comment` on a trial branch. Switch to `--gate block` when the team agrees that blocked frontend API impact should stop merge.

Use the supporting commands when you need detail before a go/no-go decision:

```bash
pnpm exec archora-forge doctor ./openapi.yaml
pnpm exec archora-forge inspect ./openapi.yaml
pnpm exec archora-forge explain unsupported-oneof
pnpm exec archora-forge generate ./openapi.yaml --dry-run
pnpm exec archora-forge check ./openapi.yaml
```

## 5. Decide From Artifacts

Review:

- `forge-audit/index.html`;
- `forge-audit/report.md`;
- `forge-impact.md`;
- `forge-impact-pr.md`;
- `forge-demo/report/check.html`, when running the demo command;
- `forge-demo/report/audit/index.html`, when running the demo command;
- `forge-pilot/go-no-go.md`, when running the pilot command;
- `forge-pilot/pilot-report.md`, when running the pilot command;
- generated TypeScript preview;
- `check` result;
- typecheck result for the generated output.

Buy or adopt Forge only when the generated resource model fits the frontend architecture, the diagnostics are clear, and the reports save review time.

## 6. Next Pages

- [Quick Start](./quick-start.md)
- [Install, Trial, Buy](./install-trial-buy.md)
- [Pilot Command](./pilot-command.md)
- [CI Impact Kit](./ci-impact-kit.md)
- [Generated Output Typecheck](./generated-output-typecheck.md)
- [Privacy and Security](./privacy-security.md)
