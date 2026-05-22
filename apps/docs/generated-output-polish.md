# Generated Output Polish

Generated files should be boring to review.

Forge keeps the output focused on:

- schema-derived TypeScript types;
- typed clients;
- operation helpers;
- query keys;
- resource metadata;
- permissions;
- labels;
- mocks.

## Review Rules

A generated change should be acceptable when:

- file names are stable;
- exports are predictable;
- operation aliases are readable;
- generated helpers do not own application policy;
- protected custom files are not overwritten;
- typecheck passes in an isolated workspace.

## Noise Budget

Avoid adding generated files unless they remove real integration work. A generated file is worth keeping when a frontend developer would otherwise hand-write the same contract repeatedly.

## Impact Before Regeneration

Use `impact` before accepting a schema change:

```bash
pnpm exec archora-forge impact ./openapi.old.yaml ./openapi.yaml --repo .
```

Use `audit` before adopting generated output:

```bash
pnpm exec archora-forge audit ./openapi.yaml --out forge-audit
```

That keeps generation, review and adoption separated.
