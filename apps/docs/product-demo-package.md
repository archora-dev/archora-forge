# Product Demo Package

The product demo package is the artifact set a buyer can inspect without a live sales call.

## Public Package

Use the public CRM demo for screenshots, recordings, docs and public examples:

- `examples/public-crm/openapi.yaml`
- `examples/public-crm/archora-forge.config.ts`
- `examples/public-crm/generated`
- `examples/public-crm/forge-check.html`

Run:

```bash
pnpm build
node packages/cli/dist/index.js check --config examples/public-crm/archora-forge.config.ts --report html --report-file examples/public-crm/forge-check.html
node packages/cli/dist/index.js check --config examples/public-crm/archora-forge.config.ts --report markdown --report-file examples/public-crm/forge-check.md
node packages/cli/dist/index.js audit --config examples/public-crm/archora-forge.config.ts --out /tmp/archora-forge-public-audit
```

The public package should show:

- live audit report: `/demo-audit/`;
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

## Private Package

For a buyer's own schema, create the package in an ignored local folder or CI artifact store:

```txt
forge-demo-package/
  openapi-source-note.md
  forge-inspect.json
  forge-lint.json
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
- `check` report shows readiness status, blockers, warnings and next actions.
- Generated TypeScript typecheck was run.
- Private identifiers are not copied into public docs, issues or examples.
- Final report states go/no-go and the reason.

## Buyer Narrative

The buyer should be able to inspect the package and understand:

- what Forge detected from their schema;
- what code it would add to their frontend;
- where generated output is useful immediately;
- what remains manual;
- whether adoption is worth paying for.
