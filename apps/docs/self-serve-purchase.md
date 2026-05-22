# Self-Serve Purchase

Archora Forge is sold first as a self-serve evaluation package with a commercial license, not as a hosted SaaS. The customer can evaluate the tool locally, keep schemas private and buy a bounded package when the generated resource layer is useful.

## Who Should Buy

Buy when your team has:

- Vue or TypeScript frontend code backed by OpenAPI 3.x contracts;
- repeated work around clients, query keys, resource modules, form/table metadata, labels, permissions or mocks;
- private schemas that should not be uploaded to a hosted generator;
- a need for CI checks around schema readiness and generated-output drift.

Do not buy yet when you need generated pages, routes, design-system components, full OpenAPI coverage or a hosted schema registry.

## What You Buy

The first commercial package is a bounded adoption package:

- commercial use rights for the agreed scope;
- local CLI usage in your repository or CI;
- generated frontend resource contract output;
- readiness, drift and diagnostics reports;
- generated-output TypeScript typecheck gate;
- adoption report template for internal approval.

Recommended scope: 1-3 schemas or one tightly related schema family.

## Self-Serve Flow

1. Run the [Public CRM Demo](/public-demo-walkthrough).
2. Run [Evaluate in 30 Minutes](/evaluate-in-30-minutes) against one private schema.
3. Review [Private Schema Pilot Proof](/pilot-proof) to understand the current evidence level.
4. Generate a local [Product Demo Package](/product-demo-package) for internal review.
5. Fill out the [Pilot Report Template](/pilot-report-template).
6. Request a commercial license using the contact listed in the repository license files.

The purchase decision should be based on artifacts: generated code, HTML reports, drift status, diagnostics, typecheck result and a go/no-go adoption report.

## Evaluation Commands

```bash
pnpm exec archora-forge init --input ./openapi.yaml
pnpm exec archora-forge inspect ./openapi.yaml --report-file forge-inspect.json
pnpm exec archora-forge lint ./openapi.yaml --strict --report-file forge-lint.json
pnpm exec archora-forge check ./openapi.yaml --report html --report-file forge-check.html
pnpm exec archora-forge generate ./openapi.yaml --dry-run --json --report-file forge-generate.json
```

After a real generation run, typecheck the generated output as described in [Generated Output Typecheck](/generated-output-typecheck).

## Pricing Anchor

Use these as packaging anchors:

- Solo/small team evaluation license: USD 499-1,499.
- Bounded commercial adoption package: USD 2k-5k.
- Enterprise schema package: USD 8k-15k.

The license should state scope, number of schemas, allowed repositories, support expectations and whether generated private artifacts can be shared.

## What The Buyer Gets Immediately

- A local-first CLI workflow.
- Public demo assets.
- Private schema workflow.
- HTML and Markdown reports.
- CI-ready commands.
- A report template for internal approval.
- Clear limitations before purchase.

## Purchase Acceptance Gate

Before paying, the buyer should be able to answer:

- Did `check` produce a readable report?
- Are detected resources close to the frontend team's mental model?
- Does generated TypeScript compile in a temporary consumer workspace?
- Are blockers acceptable or fixable?
- Can drift checks run in CI?
- Does the generated resource layer remove enough frontend work to justify the license?

If the answer is no, the right outcome is not a sale. It is a documented no-go.
