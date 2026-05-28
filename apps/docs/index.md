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

Archora Forge is a local-first commercial developer tool for TypeScript frontend teams reviewing OpenAPI changes before merge. It is not a hosted SaaS and it does not claim full OpenAPI coverage.

The core workflow is:

```bash
archora-forge impact ./openapi.yaml --base origin/main --repo . --pr-comment-file forge-impact-pr.md
archora-forge pilot ./openapi.yaml --base origin/main --repo . --out forge-pilot
```

Open `forge-impact-pr.md` before accepting the API change. Open `forge-pilot/pilot-report.md`, `forge-pilot/go-no-go.md` and `forge-pilot/audit/index.html` before adopting generated output.

Start with the [public impact report](/see-impact-report), then run the same workflow on one private schema.

For a team rollout, follow the [Team Rollout Guide](/team-rollout-guide): trial branch, first PR, comment-only CI, block-merge CI and adoption decision.
