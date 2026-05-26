# Pilot Command

`archora-forge pilot` creates the paid-pilot package from one command.

```bash
archora-forge pilot ./openapi.yaml \
  --base main \
  --repo . \
  --out forge-pilot
```

Use `--old ./openapi.old.yaml` when the previous schema is a local file. Use `--base main` when the previous schema is available in git.

The package includes:

- `impact.md`;
- `impact.json`;
- `impact-pr.md`;
- `audit/`;
- `go-no-go.md`.

Use it when a buyer wants one folder that answers:

- what changed in the API contract;
- whether the change blocks merge;
- which frontend source files already use the affected generated surface;
- whether the current schema is ready for adoption;
- what the go/no-go recommendation is.

`go-no-go.md` is intentionally short. It is the handoff file for the buyer, not a replacement for the detailed reports.
