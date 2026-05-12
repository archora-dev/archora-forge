# Docs Deployment

Docs are built with VitePress.

Local build:

```bash
pnpm --filter docs build
```

GitHub Pages workflow:

```txt
.github/workflows/docs.yml
```

For the `AKotofff/Archora-forge` repository, the workflow sets:

```bash
VITEPRESS_BASE=/Archora-forge/
```

Before enabling deploy, configure GitHub Pages to use GitHub Actions as the source.
