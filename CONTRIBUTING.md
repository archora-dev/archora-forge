# Contributing

> ⚠ **Archora Forge is proprietary, source-available, paid-use-only software.**
> See [`LICENSE`](./LICENSE) and [`COMMERCIAL-LICENSE.md`](./COMMERCIAL-LICENSE.md).
>
> External contributions are accepted **only** under a signed
> Contributor License Agreement (CLA) that assigns the copyright of
> your contribution to the Licensor (Aleksandr Kotov / Archora). Pull
> requests opened without a signed CLA will be closed.
>
> To request a CLA, email **akotov@archora.dev** with a short
> description of the change you want to make.
>
> Do not submit code you do not own or that is encumbered by a license
> incompatible with the project's proprietary license.

Archora Forge is a production-oriented developer tool. Keep changes small, verifiable and honest about the documented scope.

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
./scripts/smoke-external-consumer.sh
```

## Release Safety

Do not publish packages from a feature branch. Use `pnpm release:check` and inspect package tarballs before any release tag.
