---
layout: home

hero:
  name: Archora Forge
  text: Review OpenAPI changes before they break frontend code.
  tagline: Turn OpenAPI into a typed resource layer, adoption audit, PR impact report, repo usage scan and CI-ready frontend contract workflow.
  actions:
    - theme: brand
      text: See impact report
      link: /see-impact-report
    - theme: alt
      text: See audit report
      link: /see-audit-report
    - theme: alt
      text: Install, trial, buy
      link: /install-trial-buy

features:
  - title: Impact Center
    details: Compare old and new OpenAPI contracts, detect merge risk, find source usages and write PR comments.
  - title: Audit package
    details: Generate HTML, Markdown, JSON, CI workflow, adoption plan and generated preview files from one command.
  - title: Frontend resource layer
    details: Emit clients, types, query keys, operation helpers, metadata, permissions, labels and mocks.
  - title: Local-first evaluation
    details: Run on private schemas inside your repo or CI without uploading contracts.
---

## The Product

Archora Forge is a local-first commercial developer tool for TypeScript frontend teams evaluating OpenAPI-driven resource generation. It is not a hosted SaaS and it does not claim full OpenAPI coverage.

The core workflow is:

```bash
archora-forge impact ./openapi.old.yaml ./openapi.yaml --repo . --pr-comment-file forge-impact-pr.md
archora-forge audit ./openapi.yaml --out forge-audit
```

Open `forge-impact-pr.md` before accepting the API change. Open `forge-audit/index.html` before adopting generated output.

Start with the [public impact report](/see-impact-report), then run the same workflow on one private schema.
