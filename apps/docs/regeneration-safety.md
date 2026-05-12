# Regeneration Safety

Forge is designed for generated output that can be committed and regenerated.

Generated files are plain TypeScript resource contracts. Use `diff`, `check` or `generate --dry-run` before writing files. Re-running `generate` skips identical files and reports them as `Unchanged` instead of rewriting them:

```bash
archora-forge diff ./openapi.yaml
archora-forge check ./openapi.yaml
archora-forge generate ./openapi.yaml --dry-run
```
