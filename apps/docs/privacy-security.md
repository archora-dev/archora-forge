# Privacy and Security

Forge is local-first. OpenAPI schemas and generated output stay in the repository or CI workspace where the command runs.

Forge does not require:

- schema upload;
- hosted schema storage;
- telemetry to inspect private contracts;
- public issues with private OpenAPI snippets;
- screenshots of private generated output.

## Private Schemas

For private schemas:

```bash
pnpm exec archora-forge audit ./openapi.yaml --out forge-audit
pnpm exec archora-forge impact ./openapi.old.yaml ./openapi.yaml --repo .
```

Keep `forge-audit/`, `forge-impact.json` and `forge-impact-pr.md` as local or CI artifacts unless the buyer explicitly approves sharing them.

## Remote Schemas

Remote schemas are fetched only when the CLI is pointed at a URL. Headers are passed per command:

```bash
pnpm exec archora-forge inspect https://contracts.example.com/openapi.yaml \
  --schema-header "authorization:Bearer $TOKEN"
```

Do not paste tokens into docs, reports, commits or public issue trackers.

## Public Materials

Public demos must use neutral schemas. Do not publish:

- customer schema names;
- customer endpoint paths;
- private operation IDs;
- private generated output;
- screenshots that expose private resource names.

Use [See Audit Report](/see-audit-report) and [See Impact Report](/see-impact-report) for public review.
