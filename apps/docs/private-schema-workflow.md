# Private Schema Workflow

Forge is local-first. API contracts do not need to leave your repository or CI environment.

For private beta and paid pilots, start with one schema in a short-lived branch. Do not upload private schemas, generated private output or screenshots with customer data to public issues, docs or demo pages.

## Local Evaluation

```bash
pnpm exec archora-forge inspect ./openapi.yaml
pnpm exec archora-forge generate ./openapi.yaml --dry-run
pnpm exec archora-forge check ./openapi.yaml --report html --report-file forge-check.html
```

## Remote Private Schemas

```bash
pnpm exec archora-forge inspect https://contracts.example.com/openapi.yaml \
  --schema-header "authorization: Bearer $OPENAPI_TOKEN"
```

Headers are passed per CLI invocation or configured through `archora-forge.config.ts`.

## CI Pattern

```bash
pnpm exec archora-forge validate ./openapi.yaml --report-file forge-validate.json
pnpm exec archora-forge inspect ./openapi.yaml --report-file forge-inspect.json
pnpm exec archora-forge check ./openapi.yaml --report html --report-file forge-check.html
```

Upload the report files as CI artifacts. Keep generated code committed so drift is visible in pull requests.

## Security Notes

- Do not commit API tokens.
- Prefer CI secret storage for schema headers.
- Generated output is plain TypeScript and can be reviewed before merge.
- Forge does not upload schemas to a hosted service.
- Keep private HTML reports as internal CI artifacts unless the customer explicitly approves sharing them.
- Use the public CRM demo for screenshots and public walkthroughs.
