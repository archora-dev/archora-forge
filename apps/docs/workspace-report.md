# Workspace Report

Multi-schema workspaces can use the same report commands as single-schema projects. When `inputs` is configured and no schema argument is passed, Forge aggregates all inputs.

```bash
archora-forge check --json --report-file forge-workspace-check.json
archora-forge check --report html --report-file forge-workspace-check.html
archora-forge diff --json --report-file forge-workspace-diff.json
```

## Report Shape

Top-level fields aggregate the workspace:

- resources;
- generated files;
- protected files;
- failed checks;
- drift;
- diagnostics;
- coverage.

The `schemas` array contains per-input detail:

- input name;
- schema path;
- config path;
- health score;
- resource count;
- generated/protected file counts;
- drift count;
- diagnostics count;
- failed checks;
- coverage.

## Review Workflow

1. Review top-level failed checks.
2. Open the `schemas` array and find the input with the highest drift or diagnostic count.
3. Review per-input coverage before deciding whether the issue is local to one schema.
4. Keep output directories distinct for every input.
5. Use `generate --dry-run --json` before writing multi-schema output.
