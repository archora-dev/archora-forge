# Demo Flow

This flow shows Archora Forge as a frontend module generator, not just a client generator.

## 1. Start With OpenAPI

```txt
examples/vue-admin/openapi.yaml
```

The sample contract contains Users, Orders and Reports resources.

## 2. Build and Inspect

```bash
pnpm install
pnpm build
node packages/cli/dist/index.js inspect examples/vue-admin/openapi.yaml
```

`inspect` prints endpoint counts, schema health and detected resources.

## 3. Preview File Changes

```bash
node packages/cli/dist/index.js diff examples/vue-admin/openapi.yaml
```

`diff` reports files that would be created, updated or protected.

## 4. Generate the Example Modules

```bash
cd examples/vue-admin
node ../../packages/cli/dist/index.js generate openapi.yaml --dry-run
```

Remove `--dry-run` when you want to write files.

## 5. Review the Output

```txt
shared/api/generated/
features/users/
features/orders/
features/reports/
pages/users/
pages/orders/
pages/reports/
```

Generated files include types, clients, query keys, composables, forms, tables, pages, routes, permissions, i18n and mocks.

## 6. Run the Demo App

```bash
pnpm --filter vue-admin dev
```

The example app shows generated Users, Orders and Reports modules in one dark-first screenshot-ready overview with generated artifacts, file output and CLI flow context.

![Archora Forge demo overview](/screenshots/forge-demo-users.png)
