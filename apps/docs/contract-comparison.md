# Contract Comparison

Use `contract-diff` to compare two schema versions before regenerating files.

```bash
archora-forge contract-diff ./openapi.old.yaml ./openapi.yaml --json --report-file contract-diff.json
archora-forge contract-diff ./openapi.old.yaml ./openapi.yaml --report html --report-file contract-diff.html
```

The JSON report includes:

- `changes`;
- `affectedResources`;
- `affectedFiles`;
- `changelog`;
- `ok`.

`ok` is `false` when breaking changes are present.

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
