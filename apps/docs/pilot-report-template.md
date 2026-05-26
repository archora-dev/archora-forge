# Pilot Report Template

Use this template as the buyer-facing adoption report. It works for local evaluation, paid pilots and internal approval.

## Summary

- Buyer:
- Repository:
- Schema scope:
- Date:
- Evaluator:
- Decision: go / conditional go / no-go

## Inputs

- Schema count:
- Operation count:
- Detected resource count:
- Generated file count:
- Config preset:
- Validation mode: none / zod / valibot

## Commands Run

```bash
archora-forge doctor
archora-forge inspect ./openapi.yaml --report-file forge-inspect.json
archora-forge lint ./openapi.yaml --strict --report-file forge-lint.json
archora-forge check ./openapi.yaml --report html --report-file forge-check.html
archora-forge check ./openapi.yaml --report markdown --report-file forge-check.md
archora-forge generate ./openapi.yaml
tsc --noEmit -p ./generated-output-typecheck/tsconfig.json
```

## Results

| Gate | Result | Notes |
| --- | --- | --- |
| Schema load | pass/fail | |
| Validation | pass/fail | |
| Lint/readiness | pass/fail | |
| Drift check | pass/fail | |
| Generation | pass/fail | |
| Generated TypeScript typecheck | pass/fail | |
| CI fit | pass/fail | |

## Resource Coverage

| Kind | Count | Notes |
| --- | ---: | --- |
| CRUD resources | | |
| Read-only resources | | |
| Search resources | | |
| Dashboard resources | | |
| Action operations | | |
| File operations | | |

## Useful Generated Output

- Clients:
- Query keys:
- Operation helpers:
- Form/table metadata:
- Permissions:
- I18n labels:
- Mocks:

## Blockers

| Blocker | Owner | Action | Required Before Purchase |
| --- | --- | --- | --- |
| | | | |

## Warnings

| Warning | Impact | Action |
| --- | --- | --- |
| | | |

## Purchase Decision

Choose one:

- Go: generated output is useful, typechecks and can be adopted behind CI drift checks.
- Conditional go: useful, but purchase depends on named fixes.
- No-go: generated output does not remove enough work or schema limitations are too high.

## Next Steps

- Add Forge to CI.
- Commit generated output in a review branch.
- Connect one generated resource to the frontend app.
- Expand schema scope only after the first resource lands cleanly.
