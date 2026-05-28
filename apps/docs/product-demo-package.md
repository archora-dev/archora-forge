# Product Demo Package

The product demo package is the artifact set a buyer can inspect without a live sales call.

## Public Package

Use the public CRM demo for screenshots, recordings, docs and public examples:

- `apps/docs/public/forge-demo/report/README.md`
- `apps/docs/public/forge-demo/report/impact-pr.md`
- `apps/docs/public/forge-demo/report/check.html`
- `apps/docs/public/forge-demo/report/audit/index.html`
- `apps/docs/public/forge-demo/report/go-no-go.md`
- `examples/public-crm/openapi.yaml`
- `examples/public-crm/archora-forge.config.ts`
- `examples/public-crm/generated`
- `examples/public-crm/forge-check.html`
- public impact report: `/impact-demo/`
- public audit report: `/demo-audit/`

Run:

```bash
pnpm build
node packages/cli/dist/index.js demo --out apps/docs/public/forge-demo
node packages/cli/dist/index.js impact apps/docs/public/impact-demo/openapi.old.yaml apps/docs/public/impact-demo/openapi.new.yaml --repo apps/docs/public/impact-demo --report html --report-file /tmp/archora-forge-impact.html --pr-comment-file /tmp/archora-forge-impact-pr.md
node packages/cli/dist/index.js check --config examples/public-crm/archora-forge.config.ts --report html --report-file examples/public-crm/forge-check.html
node packages/cli/dist/index.js check --config examples/public-crm/archora-forge.config.ts --report markdown --report-file examples/public-crm/forge-check.md
node packages/cli/dist/index.js audit --config examples/public-crm/archora-forge.config.ts --out /tmp/archora-forge-public-audit
```

The public package should show:

- demo handoff: `apps/docs/public/forge-demo/report/README.md`;
- PR comment artifact: `apps/docs/public/forge-demo/report/impact-pr.md`;
- reviewer check page: `apps/docs/public/forge-demo/report/check.html`;
- audit evidence: `apps/docs/public/forge-demo/report/audit/index.html`;
- go/no-go decision: `apps/docs/public/forge-demo/report/go-no-go.md`;
- live audit report: `/demo-audit/`;
- public impact report: `/impact-demo/`;
- detected resources;
- generated clients and types;
- generated query keys and operation helpers;
- generated form/table metadata;
- generated permissions, labels and mocks;
- readiness, diagnostics and drift report.
- frontend API scorecard;
- resource explorer;
- generated-output TypeScript typecheck;
- copyable CI workflow and adoption plan.
- PR comment artifact.

## Private Package

For a buyer's own schema, create the package in an ignored local folder or CI artifact store:

```txt
forge-demo-package/
  openapi-source-note.md
  forge-inspect.json
  forge-lint.json
  forge-impact.md
  forge-impact-pr.md
  forge-check.html
  forge-check.md
  forge-check.json
  generated-output/
  generated-output-typecheck.md
  pilot-report.md
```

Do not commit private schemas, private generated output or private HTML reports to a public repository.

## Acceptance Checklist

- Schema loaded locally or in customer CI.
- Generated output was produced in a branch or temporary workspace.
- `impact` report was produced for a real or representative API change.
- `check` report shows readiness status, `pass` / `warn` / `fail` gate, blockers, warnings and next actions.
- Generated TypeScript typecheck was run.
- Private identifiers are not copied into public docs, issues or examples.
- Final report states go/no-go and the reason.

## Buyer Narrative

The buyer should be able to inspect the package and understand:

- what Forge detected from their schema;
- what code it would add to their frontend;
- which frontend API usages are affected by a contract change;
- where generated output is useful immediately;
- what remains manual;
- whether adoption is worth paying for.
