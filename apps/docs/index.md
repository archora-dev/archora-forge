---
layout: home

hero:
  name: Archora Forge
  text: Run one command. Get a frontend API adoption report.
  tagline: Turn OpenAPI into a typed resource layer, scorecard, resource explorer, generated-output typecheck, CI workflow and go/no-go adoption plan.
  actions:
    - theme: brand
      text: See the audit report
      link: /see-audit-report
    - theme: alt
      text: Run audit
      link: /run-audit-quickstart
    - theme: alt
      text: What you get
      link: /what-you-get

features:
  - title: Audit package
    details: Generate HTML, Markdown, JSON, CI workflow, adoption plan and generated preview files from one command.
  - title: Frontend resource layer
    details: Emit clients, types, query keys, operation helpers, metadata, permissions, labels and mocks.
  - title: Typecheck proof
    details: Compile generated TypeScript in an isolated workspace before adoption.
  - title: Local-first evaluation
    details: Run on private schemas inside your repo or CI without uploading contracts.
---

## The Product

Archora Forge is a local-first commercial developer tool for TypeScript frontend teams evaluating OpenAPI-driven resource generation. It is not a hosted SaaS and it does not claim full OpenAPI coverage.

The core workflow is:

```bash
archora-forge audit ./openapi.yaml --out forge-audit
```

Open `forge-audit/index.html` and review the scorecard, resource explorer, generated files, typecheck result, drift, diagnostics and adoption plan.

Start with the [public audit report](/see-audit-report), then run the same workflow on one private schema.
