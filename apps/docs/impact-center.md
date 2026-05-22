# Impact Center

`archora-forge impact` turns an OpenAPI contract change into a frontend review artifact.

```bash
archora-forge impact ./openapi.old.yaml ./openapi.yaml --report markdown --report-file forge-impact.md
archora-forge impact ./openapi.old.yaml ./openapi.yaml --report html --report-file forge-impact.html
archora-forge impact ./openapi.old.yaml ./openapi.yaml --json --report-file forge-impact.json
archora-forge impact ./openapi.old.yaml ./openapi.yaml --repo . --pr-comment-file forge-impact-pr.md
```

The command is built for pull requests. It answers:

- can this API change merge under the current frontend risk policy;
- which resources are affected;
- which generated files will change;
- which operation IDs, client methods and query hooks are in the blast radius;
- which source files in the consumer repo already use the impacted API surface;
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

## Repo Usage Scan

Add `--repo <path>` when Forge should scan the consuming frontend repository for impacted usages:

```bash
archora-forge impact ./openapi.old.yaml ./openapi.yaml --repo . --report html --report-file forge-impact.html
```

The scan looks for impacted operation IDs, client methods, query hooks and generated resource helpers. It skips common build folders such as `node_modules`, `.git`, `dist`, `build` and `coverage`.

The JSON report includes `sourceUsages`:

```json
[
  {
    "path": "src/users-page.ts",
    "matches": ["createUser", "usersClient"]
  }
]
```

## PR Comment Artifact

Use `--pr-comment-file` to write a compact Markdown comment for GitHub or GitLab:

```bash
archora-forge impact ./openapi.old.yaml ./openapi.yaml \
  --repo . \
  --json \
  --report-file forge-impact.json \
  --pr-comment-file forge-impact-pr.md
```

The comment includes the decision, merge risk, migration hints and impacted source files.
