# OpenAPI Quality Linting

`lint` reports frontend generation readiness. The score is a triage signal, not a pass/fail quality certification.

```bash
archora-forge lint ./openapi.yaml
archora-forge lint ./openapi.yaml --strict
archora-forge lint ./openapi.yaml --json
```

Preview rules include:

- missing `operationId`;
- missing tags;
- missing request schema for write operations;
- missing response schema for read operations;
- unsupported OpenAPI features reported by diagnostics;
- unsafe identifiers that need TypeScript sanitizing;
- missing 4xx/5xx responses.

This is not a Spectral replacement. It is a Forge-specific readiness check.

Without `--strict`, the command exits successfully unless error-severity diagnostics are present. Use `--strict` in CI when warnings should fail the job.
