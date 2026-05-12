# Contract Diff

`contract-diff` compares two OpenAPI contracts and reports frontend impact.

```bash
archora-forge contract-diff ./old-openapi.yaml ./new-openapi.yaml
archora-forge contract-diff ./old-openapi.yaml ./new-openapi.yaml --json
archora-forge contract-diff ./old-openapi.yaml ./new-openapi.yaml --json --report-file contract-diff.json
```

Detected categories:

- removed endpoint;
- added endpoint;
- required field added;
- field removed;
- enum value added or removed;
- type changed;
- request/response schema presence changes.

The JSON report includes `ok`, `oldSchema`, `newSchema`, affected resources and affected generated files. It is not a full OpenAPI diff engine; it focuses on practical frontend generation risk.
