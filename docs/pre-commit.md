# Pre-commit drift guard

Catch stale generated output **before** it is committed, locally, on the free tier.
The hook regenerates with `archora-forge generate` and fails the commit if the
committed output would change — the standard "regenerate + git diff" codegen guard.

## Install

Copy `scripts/forge-pre-commit.sh` into your repo:

- **Husky:** save it as `.husky/pre-commit`.
- **Plain git:** save it as `.git/hooks/pre-commit` and run `chmod +x .git/hooks/pre-commit`.

Configure via environment variables (defaults shown):

```sh
FORGE_SCHEMA=openapi.yaml   # OpenAPI schema path
FORGE_OUTPUT=src            # directory holding Forge-owned generated output
```

## What it does

```sh
npx archora-forge generate "$FORGE_SCHEMA"
git diff --quiet -- "$FORGE_OUTPUT"   # non-zero exit ⇒ output drifted ⇒ commit blocked
```

If the schema changed but the committed output was not regenerated, the hook leaves the
freshly generated files in your working tree and stops the commit with a clear message,
so you stage the regenerated contract instead of merging a stale one.

## In CI

Pair this with the Pro `archora-forge check` gate (drift + health thresholds) and the
`archora-forge ci init github` impact workflow so drift is caught both locally and on
every PR. See [impact-demo.md](./impact-demo.md).
