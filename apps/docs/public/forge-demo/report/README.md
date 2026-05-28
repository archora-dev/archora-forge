# Forge Demo Package

Open `impact-pr.md` first. It is the pull-request comment a reviewer should see before merge.

Then review:

- Open `impact.md` for the full frontend API impact report.
- Open `check.html` for the reviewer-friendly readiness summary.
- Open `audit/index.html` for generated output readiness and audit evidence.
- Open `go-no-go.md` for the short adoption decision.

To run the same package on a real repo:

```sh
archora-forge pilot ./openapi.yaml --base origin/main --repo . --out forge-pilot
archora-forge ci init github --schema ./openapi.yaml --base origin/main --gate comment
```
