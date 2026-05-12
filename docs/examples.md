# Examples

Available examples:

- `examples/vue-admin` — generated Vue admin preview with Users, Orders and Reports resources.

Recommended first run:

```bash
pnpm install
pnpm build
pnpm --filter vue-admin dev
```

CLI generation smoke:

```bash
node packages/cli/dist/index.js inspect examples/vue-admin/openapi.yaml
node packages/cli/dist/index.js generate examples/vue-admin/openapi.yaml --dry-run
```
