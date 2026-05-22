# Contract Comparison

Use `contract-diff` to compare two schema versions before regenerating files.

```bash
archora-forge contract-diff ./openapi.old.yaml ./openapi.yaml --json --report-file contract-diff.json
archora-forge contract-diff ./openapi.old.yaml ./openapi.yaml --report html --report-file contract-diff.html
archora-forge impact ./openapi.old.yaml ./openapi.yaml --report markdown --report-file impact.md
```

The JSON report includes:

- `changes`;
- `affectedResources`;
- `affectedFiles`;
- `changelog`;
- `summary`;
- `decision`;
- `impactedSurface`;
- `migrationHints`;
- `prSummary`;
- `ok`.

`ok` is `false` when breaking changes are present.

Use `impact` when the output is meant for pull-request review. It includes merge risk, operation IDs, client methods, query hooks and migration hints in Markdown, JSON or HTML. Add `--repo .` to include source files that already use the impacted generated API surface.

## Generated Changelog

The `changelog` field gives a short review summary:

```json
[
  "BREAKING users: 2 breaking, 1 non-breaking, 0 warning changes.",
  "3 resource contract files affected."
]
```

Use it in pull-request comments or release notes. The detailed `changes` list remains the source of truth.

## Suggested Workflow

1. Save the last accepted schema as `openapi.old.yaml`.
2. Compare the old and new schemas.
3. Review breaking changes by resource.
4. Review affected generated files.
5. Regenerate only after accepting the contract change.
