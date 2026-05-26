# Install, Trial, Buy

The evaluation path should work without a sales call. Purchase is manual
for now: send the artifacts and requested scope to the license contact.

## Install

```bash
pnpm add -D @archora/forge-cli @archora/forge-adapters
pnpm exec archora-forge --help
```

During local repository development, use:

```bash
node packages/cli/dist/index.js --help
```

## Trial

Start with the built-in demo when you want to see the workflow before touching a private schema:

```bash
pnpm exec archora-forge demo --out forge-demo
```

Run the two-command workflow first:

```bash
pnpm exec archora-forge impact ./openapi.yaml \
  --base main \
  --repo . \
  --report markdown \
  --report-file forge-impact.md \
  --pr-comment-file forge-impact-pr.md
pnpm exec archora-forge audit ./openapi.yaml --out forge-audit
```

Review:

- `forge-audit/index.html`;
- `forge-audit/report.md`;
- `forge-impact.md`;
- `forge-impact-pr.md`;
- generated preview files;
- generated-output typecheck result.

## Buy

Request a license when the artifacts prove that Forge saves review time:

- generated TypeScript compiles;
- the resource model matches the frontend architecture;
- diagnostics are either fixed or accepted;
- impact reports identify real source usage;
- CI can run locally or in the buyer repository;
- the license scope matches the number of teams and repositories.

Do not buy yet when the team needs generated application screens, owned routing, hosted schema storage or a replacement for their design system.

Send the license request to `akotov@archora.dev` or Telegram `@akotofff`
with the company name, intended use, number of developers, schema count,
frontend project count, CI usage, and preferred billing model.

You can generate the request file locally:

```bash
pnpm exec archora-forge license request --plan trial --out license-request.md
```
