# Beta Feedback

When reporting beta feedback, include:

- OpenAPI size and shape;
- command used;
- config file;
- expected generated files;
- actual generated files or diagnostics;
- whether this blocks evaluation or is a polish issue.

Useful commands:

```bash
archora-forge inspect ./openapi.yaml --json
archora-forge validate ./openapi.yaml --strict
archora-forge lint ./openapi.yaml --json
archora-forge generate ./openapi.yaml --dry-run
```
