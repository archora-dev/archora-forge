# Pilot Command

`archora-forge pilot` creates the paid-pilot package from one command.

```bash
archora-forge pilot ./openapi.yaml \
  --base origin/main \
  --repo . \
  --out forge-pilot
```

Use `--old ./openapi.old.yaml` when the previous schema is a local file. Use `--base origin/main` when the previous schema is available in git.

The package includes:

- `impact.md`;
- `impact.json`;
- `impact-pr.md`;
- `audit/`;
- `go-no-go.md`;
- `pilot-report.md`.

Use it when a buyer wants one folder that answers:

- what changed in the API contract;
- whether the change blocks merge;
- which frontend source files already use the affected generated surface;
- whether the current schema is ready for adoption;
- what the go/no-go recommendation is.

`go-no-go.md` is intentionally short. It is the handoff file for the buyer, not a replacement for the detailed reports.

`pilot-report.md` is the ready-to-send reviewer report. It links the PR comment, impact report, audit HTML, audit Markdown, JSON payload and go/no-go decision in one file. It also includes a reviewer checklist for the merge decision, generated surface, audit report, typecheck result and rollout decision.
