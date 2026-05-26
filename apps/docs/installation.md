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
pnpm exec archora-forge demo --out forge-demo
pnpm exec archora-forge generate
```

Commercial builds may require license activation before write/report commands:

```bash
pnpm exec archora-forge license activate ARCHORA-FORGE-...
pnpm exec archora-forge license request --plan trial --out license-request.md
pnpm exec archora-forge license status
```
