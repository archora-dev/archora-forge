# Contract Diff

`contract-diff` compares two OpenAPI contracts and reports frontend impact.

```bash
archora-forge contract-diff ./old-openapi.yaml ./new-openapi.yaml
archora-forge contract-diff ./old-openapi.yaml ./new-openapi.yaml --json
```

Detected preview categories:

- removed endpoint;
- added endpoint;
- required field added;
- field removed;
- enum value added or removed;
- type changed;
- request/response schema presence changes.

The command also returns affected resources and generated files. It is not a full OpenAPI diff engine; it focuses on practical frontend generation risk.
