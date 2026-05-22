# CI Impact Kit

The CI impact kit turns Forge into a pull-request guard for OpenAPI changes.

Use it when a repository has a committed schema such as `openapi.yaml` and frontend code that imports generated clients, query keys or operation helpers.

## GitHub Actions

Start from the template:

[Download `forge-impact-github-actions.yml`](/templates/forge-impact-github-actions.yml)

The core step is:

```bash
pnpm exec archora-forge impact openapi.base.yaml openapi.yaml \
  --repo . \
  --json \
  --report-file forge-impact.json \
  --pr-comment-file forge-impact-pr.md
```

`impact` exits with `1` when the decision is `blocked`. That is the strict mode.

## Advisory Mode

For the first week, make the command advisory:

```bash
pnpm exec archora-forge impact openapi.base.yaml openapi.yaml \
  --repo . \
  --json \
  --report-file forge-impact.json \
  --pr-comment-file forge-impact-pr.md || true
```

Advisory mode still uploads the report and writes the PR comment. It just avoids blocking merges while the team calibrates the workflow.

## Artifacts

Upload at least:

- `forge-impact.json`;
- `forge-impact-pr.md`;
- `forge-impact.html` when HTML review is useful.

Keep the JSON for automation and the Markdown for pull-request comments.

## Exit Codes

- `0`: impact decision is `approved` or `review`.
- `1`: impact decision is `blocked`.
- `2`: schema loading, config, CLI usage or runtime failure.

Use strict mode for protected branches after the team agrees that breaking frontend contract changes must be reviewed before merge.
