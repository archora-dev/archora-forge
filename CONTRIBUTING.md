# Contributing

Archora Forge is a preview project. Keep changes small, verifiable and honest about limitations.

## Local Setup

```bash
pnpm install
pnpm build
pnpm test
```

## Development Checks

Run the relevant focused test first, then the full suite before opening a PR:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter docs build
pnpm --filter vue-admin typecheck
pnpm --filter vue-admin build
./scripts/smoke-external-consumer.sh
```

## Release Safety

Do not publish packages from a feature branch. Use `pnpm release:check` and inspect package tarballs before any preview tag.
