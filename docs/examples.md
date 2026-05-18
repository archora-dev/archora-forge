# Examples

Available examples:

- `examples/public-crm` - CRM schema used by the public walkthrough.
- `examples/mini-ecommerce` - compact catalog, cart, orders and customers schema.
- `examples/petstore` - compact Petstore schema with pets, orders and users.
- `examples/ui-kit-integration` - consumer-owned UI kit mapping example for generated resource metadata.

Recommended first run:

```bash
pnpm install
pnpm build
pnpm --filter public-crm-demo typecheck
pnpm --filter mini-ecommerce-demo typecheck
pnpm --filter petstore-demo typecheck
pnpm --filter ui-kit-integration typecheck
```

CLI generation smoke:

```bash
node packages/cli/dist/index.js inspect --config examples/public-crm/archora-forge.config.ts
node packages/cli/dist/index.js generate --config examples/public-crm/archora-forge.config.ts --dry-run
node packages/cli/dist/index.js inspect --config examples/mini-ecommerce/archora-forge.config.ts
node packages/cli/dist/index.js generate --config examples/mini-ecommerce/archora-forge.config.ts --dry-run
node packages/cli/dist/index.js inspect --config examples/petstore/archora-forge.config.ts
node packages/cli/dist/index.js generate --config examples/petstore/archora-forge.config.ts --dry-run
```
