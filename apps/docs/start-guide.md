# Start Guide

Use this path when you open Archora Forge for the first time and want to understand, evaluate and run it without a call.

## 1. Understand The Product

Forge is a local-first OpenAPI tool for frontend teams. It produces:

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

## 3. Install And Check The CLI

```bash
pnpm add -D archora-forge
pnpm exec archora-forge --help
```

Inside this repository, use the built local CLI:

```bash
pnpm install
pnpm build
node packages/cli/dist/index.js --help
```

## 4. Run A Local Contract Review

For a first pass on one schema:

```bash
pnpm exec archora-forge doctor ./openapi.yaml
pnpm exec archora-forge inspect ./openapi.yaml
pnpm exec archora-forge audit ./openapi.yaml --out forge-audit
pnpm exec archora-forge generate ./openapi.yaml --dry-run
pnpm exec archora-forge check ./openapi.yaml
```

For a pull request with an API change:

```bash
pnpm exec archora-forge impact ./openapi.old.yaml ./openapi.yaml \
  --repo . \
  --report markdown \
  --report-file forge-impact.md \
  --pr-comment-file forge-impact-pr.md
```

## 5. Decide From Artifacts

Review:

- `forge-audit/index.html`;
- `forge-audit/report.md`;
- `forge-impact.md`;
- `forge-impact-pr.md`;
- generated TypeScript preview;
- `check` result;
- typecheck result for the generated output.

Buy or adopt Forge only when the generated resource model fits the frontend architecture, the diagnostics are clear, and the reports save review time.

## 6. Next Pages

- [Quick Start](./quick-start.md)
- [Install, Trial, Buy](./install-trial-buy.md)
- [CI Impact Kit](./ci-impact-kit.md)
- [Generated Output Typecheck](./generated-output-typecheck.md)
- [Privacy and Security](./privacy-security.md)
