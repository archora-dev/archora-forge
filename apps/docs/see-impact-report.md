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

The normal PR command uses the previous schema from git:

```bash
archora-forge impact ./openapi.yaml \
  --base origin/main \
  --repo . \
  --report html \
  --report-file forge-impact.html \
  --pr-comment-file forge-impact-pr.md
```

The public demo report is generated from checked-in old/new demo schemas because it is a static fixture.

Use this report before accepting an API contract change. Regenerate files after the impact is understood.
