# Evaluate Forge in 30 Minutes

Use this flow to decide whether Archora Forge fits one real OpenAPI schema without a sales call.

Forge is a local-first commercial developer tool with preview limitations. Treat this evaluation as a purchase-readiness check, not as proof that the tool is production-ready for every OpenAPI contract.

For a no-private-data walkthrough first, run the public CRM demo:

```bash
pnpm build
node packages/cli/dist/index.js inspect --config examples/public-crm/archora-forge.config.ts
node packages/cli/dist/index.js lint --config examples/public-crm/archora-forge.config.ts --strict
node packages/cli/dist/index.js generate --config examples/public-crm/archora-forge.config.ts --dry-run
```

## 1. Install

```bash
pnpm add -D @archora/forge-cli @archora/forge-adapters
pnpm exec archora-forge init --input ./openapi.yaml
```

## 2. Inspect the Schema

```bash
pnpm exec archora-forge doctor
pnpm exec archora-forge inspect ./openapi.yaml --report html --report-file forge-inspect.html
pnpm exec archora-forge lint ./openapi.yaml --json --report-file forge-lint.json
```

Review:

- detected resources;
- diagnostics by code;
- missing response schemas;
- unsupported operations;
- auth/header modeling.

## 3. Preview Generated Output

```bash
pnpm exec archora-forge diff ./openapi.yaml
pnpm exec archora-forge generate ./openapi.yaml --dry-run --json --report-file forge-generate.json
```

Check whether the generated resource names and operation helpers match your frontend architecture.

## 4. Generate in a Branch

```bash
git switch -c evaluate-archora-forge
pnpm exec archora-forge generate ./openapi.yaml
pnpm exec archora-forge check ./openapi.yaml --report html --report-file forge-check.html
pnpm exec archora-forge check ./openapi.yaml --report markdown --report-file forge-check.md
pnpm exec archora-forge check ./openapi.yaml --json
pnpm exec archora-forge audit ./openapi.yaml --out forge-audit
```

The generated output should be committed and reviewed like application code. The `check` report includes a pilot readiness section with a status, decision, blockers, warnings and next actions. Treat it as an adoption-review artifact, not as a production-readiness certificate.

## 5. Typecheck Generated Output

Create a temporary workspace and run TypeScript against the generated files. Use [Generated Output Typecheck](/generated-output-typecheck) as the exact artifact format.

```bash
tsc --noEmit -p ./generated-output-typecheck/tsconfig.json
```

This should pass before purchase, or every failure should be triaged as a schema issue, known limitation, generator defect or missing temporary-workspace dependency.

## 6. Fill The Report

Use [Pilot Report Template](/pilot-report-template) to record the outcome. A buyer should be able to approve or reject purchase from the report without a live walkthrough.

## 7. Decision Criteria

Forge is a good fit when:

- the schema produces useful typed clients and operation helpers;
- diagnostics are understandable and actionable;
- generated metadata maps into your forms/tables/design system;
- `check` can be used as a CI gate and produces a clear pilot readiness decision;
- generated TypeScript passes typecheck or failures are fully triaged;
- regeneration does not overwrite custom code.
- preview limitations are acceptable for the purchase scope.

Forge is not a good fit when:

- you need generated pages/components;
- your API has no stable OpenAPI contract;
- discriminator-heavy polymorphism is central to the domain;
- you need a hosted schema registry rather than local code generation.
- you need a broad production license before proving the workflow on one schema.

## Purchase Next Step

When the report is a go or conditional go, use [License and Paid Pilot](/self-serve-purchase) to choose the commercial package and license scope.
