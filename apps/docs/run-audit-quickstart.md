# Run Audit Quickstart

Use this when you want the shortest possible evaluation path.

## Install

```bash
pnpm add -D @archora/forge-cli
```

## Run

```bash
pnpm exec archora-forge audit ./openapi.yaml --out forge-audit
```

## Open

```txt
forge-audit/index.html
```

## Decide

Buy or adopt only when:

- scorecard is acceptable;
- generated TypeScript typecheck passes;
- drift is understood;
- diagnostics are either empty or triaged;
- generated resources match the frontend team's mental model.

If the report is blocked, use the fix suggestions before expanding the scope.
