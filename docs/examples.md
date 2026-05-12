# Examples

Available examples:

- `examples/ui-kit-integration` — consumer-owned UI kit mapping example for generated resource metadata.

Recommended first run:

```bash
pnpm install
pnpm build
pnpm --filter ui-kit-integration typecheck
```

CLI generation smoke:

```bash
node packages/cli/dist/index.js inspect test/fixtures/openapi/basic-crud.yaml
node packages/cli/dist/index.js generate test/fixtures/openapi/basic-crud.yaml --dry-run
```
