# Regeneration Safety

Forge is designed for generated output that can be committed and regenerated.

```txt
UsersTable.generated.vue  regenerated
UsersTable.vue            protected custom wrapper
```

Generated files use `.generated.*` naming where appropriate. Custom wrapper files are preserved by default, so teams can keep product-specific behavior while refreshing the generated contract layer.

Use `diff` or `generate --dry-run` before writing files:

```bash
archora-forge diff ./openapi.yaml
archora-forge generate ./openapi.yaml --dry-run
```

Use `--force` only when intentionally overwriting protected custom files.
