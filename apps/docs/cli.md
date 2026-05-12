# CLI

The CLI is intentionally small: inspect the contract, preview the generated frontend module, then write files.

```bash
archora-forge init
archora-forge inspect ./openapi.yaml
archora-forge validate ./openapi.yaml
archora-forge diff ./openapi.yaml
archora-forge lint ./openapi.yaml
archora-forge contract-diff ./old-openapi.yaml ./new-openapi.yaml
archora-forge generate ./openapi.yaml
```

## Commands

- `init` creates `archora-forge.config.ts` with default output folders.
- `inspect` prints schema summary, detected resources, health score and warnings.
- `validate` checks that the schema can be parsed and normalized.
- `diff` shows create/update/protected file counts without writing files.
- `lint` reports frontend generation readiness diagnostics.
- `contract-diff` compares old/new contracts and reports affected generated files.
- `generate` writes the frontend module files.

## Flags

- `--dry-run` prints the generation result without writing files.
- `--force` allows overwriting protected custom wrapper files.

For local repository development before publishing:

```bash
node packages/cli/dist/index.js inspect examples/vue-admin/openapi.yaml
```
