# Quick Start

Build the workspace and inspect the example OpenAPI contract:

```bash
pnpm install
pnpm build
node packages/cli/dist/index.js inspect examples/vue-admin/openapi.yaml
node packages/cli/dist/index.js diff examples/vue-admin/openapi.yaml
```

Generate from inside the example app:

```bash
cd examples/vue-admin
node ../../packages/cli/dist/index.js generate openapi.yaml --dry-run
pnpm dev
```

In an external application after installing the CLI package:

```bash
archora-forge init
archora-forge inspect ./openapi.yaml
archora-forge diff ./openapi.yaml
archora-forge generate ./openapi.yaml
```

Generated files include typed clients, query keys, Vue composables, forms, tables, pages, routes, permissions, i18n and mocks. Custom wrapper files are protected unless `--force` is passed.
