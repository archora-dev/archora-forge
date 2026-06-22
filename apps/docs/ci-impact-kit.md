# CI Impact Kit

The CI impact kit turns Forge into a pull-request guard for OpenAPI changes.

Use it when a repository has a committed schema such as `openapi.yaml` and frontend code that imports generated clients, query keys or operation helpers.

## GitHub Actions

Generate the workflow:

```bash
pnpm exec archora-forge ci init github --schema ./openapi.yaml --base origin/main --gate comment
pnpm exec archora-forge ci init github --schema ./openapi.yaml --base origin/main --gate block --force
```

Or start from the template:

[Download `forge-impact-github-actions.yml`](/templates/forge-impact-github-actions.yml)

The core step is:

```bash
pnpm exec archora-forge impact ./openapi.yaml \
  --base origin/main \
  --repo . \
  --report markdown \
  --report-file forge-impact.md \
  --pr-comment-file forge-impact-pr.md
```

`--gate comment` posts the PR comment and uploads artifacts without blocking merge. `--gate block` posts the same comment, uploads the same artifacts, then fails the job when Forge reports blocked API impact.

Each run also writes a `FORGE_CI.md` handoff that explains what the gate does and how to read the report. Re-running `ci init` is idempotent: an unchanged kit reports "already up to date", and a changed file is overwritten only with `--force`. Pass `--no-readme` to skip the handoff.

## GitLab CI

Generate an includable pipeline:

```bash
pnpm exec archora-forge ci init gitlab --schema ./openapi.yaml --base origin/main --gate comment
```

This writes `.gitlab/archora-forge-impact.yml`. Include it from your `.gitlab-ci.yml`:

```yaml
include:
  - local: '.gitlab/archora-forge-impact.yml'
```

The job runs on merge-request pipelines. With `--gate comment` it stays green and attaches the impact report as an artifact; with `--gate block` a blocked impact fails the job and blocks the merge request.

Report language maps to CI behavior:

| Report gate | Meaning                                                             | Recommended CI mode |
| ----------- | ------------------------------------------------------------------- | ------------------- |
| `pass`      | No current blockers under the selected policy.                      | `--gate block`      |
| `warn`      | Continue review, but keep owner acceptance explicit.                | `--gate comment`    |
| `fail`      | Do not merge or widen rollout until blockers are fixed or accepted. | `--gate block`      |

## Advisory Mode

For the first week, use the generated advisory workflow:

```bash
pnpm exec archora-forge ci init github --schema ./openapi.yaml --base origin/main --gate comment
```

Advisory mode still uploads the report and writes the PR comment. It just avoids blocking merges while the team calibrates the workflow.

## Artifacts

Upload at least:

- `forge-impact.md`;
- `forge-impact-pr.md`;
- `forge-impact.html` when HTML review is useful.

Keep the JSON for automation and the Markdown for pull-request comments.

## Exit Codes

- `0`: impact decision is `approved` or `review`.
- `1`: impact decision is `blocked`.
- `2`: schema loading, config, CLI usage or runtime failure.

Use strict mode for protected branches after the team agrees that breaking frontend contract changes must be reviewed before merge.
