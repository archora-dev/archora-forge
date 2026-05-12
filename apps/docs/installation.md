# Installation

Archora Forge is not published yet. During development, use the workspace CLI package.

```bash
pnpm install
pnpm build
```

Once published, consumer usage should look like this:

```bash
pnpm add -D @archora/forge-cli @archora/forge-adapters
pnpm exec archora-forge init --input ./openapi.yaml
pnpm exec archora-forge doctor
pnpm exec archora-forge inspect
pnpm exec archora-forge generate
```
