# Adoption Report

`archora-forge check` is the adoption-review command. It reads the schema and config, builds the generation plan in memory, compares generated files with the workspace, and writes a report that can be attached to a pull request or pilot handoff.

```bash
archora-forge check ./openapi.yaml --report markdown --report-file forge-check.md
archora-forge check ./openapi.yaml --report html --report-file forge-check.html
archora-forge check ./openapi.yaml --report json --report-file forge-check.json
```

## Report Contents

The report includes:

- schema health score;
- detected resource count;
- generated and protected file counts;
- failed checks under the current CI policy;
- generated-output drift;
- OpenAPI diagnostics;
- generator metadata alignment;
- schema coverage matrix;
- pilot readiness status, decision, blockers, warnings and next actions;
- per-schema summaries for multi-schema workspaces.

The JSON payload is the automation source of truth. Markdown is useful for pull-request summaries. HTML is the handoff artifact for people who did not run the CLI.

## Readiness Status

`ready` means the current policy found no blockers or warnings.

`needs-attention` means the schema can continue through review, but warnings or health-score risks should be triaged.

`blocked` means drift, configured failed checks or error diagnostics must be resolved or explicitly accepted before handoff.

The readiness section is a decision aid. It is not a production certification.

## Review Workflow

1. Run `archora-forge generate` and commit generated output.
2. Run `archora-forge check --report html --report-file forge-check.html`.
3. Review failed checks first.
4. Review drift entries and decide whether to regenerate or defer.
5. Review diagnostics by code and by affected resource.
6. Review the schema coverage matrix for fallback and diagnostic-only cases.
7. Attach Markdown or HTML output to the pull request or pilot handoff.

## What To Escalate

Escalate these before treating the schema as ready:

- drift in committed generated files;
- `errors` in failed checks;
- `unsupported-features` when the affected operations are in pilot scope;
- `missing-schemas` on list, detail, create or update operations;
- generator metadata mismatches after a Forge upgrade;
- coverage matrix entries with high fallback or diagnostic-only counts.
