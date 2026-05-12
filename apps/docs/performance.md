# Performance Notes

Large OpenAPI schemas should be profiled with:

```bash
node scripts/generate-large-fixture.mjs
node scripts/benchmark-large-schema.mjs
```

This preview pass adds the benchmark entry points, but does not claim a full performance tuning cycle. Use results as local guidance and record before/after numbers before promising large-schema SLAs.

Local baseline recorded on 2026-05-11:

```json
{
  "fixture": "test/fixtures/openapi/large-synthetic.yaml",
  "endpoints": 500,
  "schemas": 300,
  "resources": 100,
  "files": 2601,
  "timingsMs": {
    "parse": 141,
    "normalize": 3,
    "detect": 1,
    "generationPlan": 11542
  }
}
```

Interpretation:

- The large synthetic fixture does not OOM on the current branch.
- Generation planning is the dominant cost and should be treated as a known beta performance risk for very large schemas.
- These numbers are local machine guidance only, not a public SLA.
