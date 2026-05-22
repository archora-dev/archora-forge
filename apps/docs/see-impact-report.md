# See Impact Report

Open the public impact demo:

[View the generated impact report](/impact-demo/)

The demo compares two OpenAPI versions and shows the frontend blast radius before regeneration:

- decision and merge risk;
- breaking, warning and non-breaking counts;
- affected resources and generated files;
- operation IDs, client methods and query hooks;
- migration hints;
- source files that already use the impacted API surface;
- a pull-request comment artifact.

The same command generated the report:

```bash
archora-forge impact ./openapi.old.yaml ./openapi.yaml \
  --repo . \
  --report html \
  --report-file forge-impact.html \
  --pr-comment-file forge-impact-pr.md
```

Use this report before accepting an API contract change. Regenerate files after the impact is understood.
