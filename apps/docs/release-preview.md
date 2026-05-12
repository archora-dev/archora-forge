# Preview Release

Archora Forge packages are publishable preview/devtool packages, not stable production APIs.

## Checks

Run before any preview tag:

```bash
pnpm release:check
pnpm pack:check
./scripts/smoke-external-consumer.sh
```

`pack:check` builds publishable packages, runs `pnpm pack` and rejects tarballs that include local-only content such as `node_modules`, prompts, docs build output, screenshots, source maps or audit folders.

## Versioning

Preview versions should use prerelease tags such as `0.2.0-preview.0`. The package release order is:

1. `@archora/forge-config`
2. `@archora/forge-runtime`
3. `@archora/forge-core`
4. `@archora/forge-adapters`
5. `@archora/forge-templates`
6. `@archora/forge-cli`

The `.changeset` folder documents the preview strategy. Do not publish to npm without a separate approval step.

## Consumer Smoke

The external smoke installs the packed CLI into `/tmp/archora-forge-consumer`, then runs `inspect`, `validate`, `diff`, `check` and `generate --dry-run`/`generate` against a local OpenAPI contract.
