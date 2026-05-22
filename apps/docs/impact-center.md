# Impact Center

`archora-forge impact` turns an OpenAPI contract change into a frontend review artifact.

```bash
archora-forge impact ./openapi.old.yaml ./openapi.yaml --report markdown --report-file forge-impact.md
archora-forge impact ./openapi.old.yaml ./openapi.yaml --report html --report-file forge-impact.html
archora-forge impact ./openapi.old.yaml ./openapi.yaml --json --report-file forge-impact.json
```

The command is built for pull requests. It answers:

- can this API change merge under the current frontend risk policy;
- which resources are affected;
- which generated files will change;
- which operation IDs, client methods and query hooks are in the blast radius;
- which migration hints should be reviewed before regeneration.

## Decision

The report includes a decision block:

```json
{
  "status": "blocked",
  "mergeRisk": "high",
  "reason": "2 breaking frontend contract changes detected."
}
```

`blocked` means breaking frontend contract changes were detected. `review` means no breaking changes were found, but warnings still need a human decision. `approved` means the detected changes are safe under the current impact model.

## PR Summary

The `prSummary` field is copyable into a pull-request comment:

```txt
Frontend API impact: blocked (high risk).
2 breaking frontend contract changes detected.
Changes: 2 breaking, 0 warnings, 1 non-breaking.
Affected resources: users.
Affected generated files: 3.
```

Use this before regenerating files. The API change should be accepted or fixed first; regeneration should come after the contract review is clear.
