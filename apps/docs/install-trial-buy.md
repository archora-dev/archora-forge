# Install, Trial, Buy

The self-serve path should work without a sales call.

## Install

```bash
pnpm add -D archora-forge
pnpm exec archora-forge --help
```

During local repository development, use:

```bash
node packages/cli/dist/index.js --help
```

## Trial

Run the public workflow first:

```bash
pnpm exec archora-forge audit ./openapi.yaml --out forge-audit
pnpm exec archora-forge impact ./openapi.old.yaml ./openapi.yaml \
  --repo . \
  --report markdown \
  --report-file forge-impact.md \
  --pr-comment-file forge-impact-pr.md
```

Review:

- `forge-audit/index.html`;
- `forge-audit/report.md`;
- `forge-impact.md`;
- `forge-impact-pr.md`;
- generated preview files;
- generated-output typecheck result.

## Buy

Buy when the artifacts prove that Forge saves review time:

- generated TypeScript compiles;
- the resource model matches the frontend architecture;
- diagnostics are either fixed or accepted;
- impact reports identify real source usage;
- CI can run locally or in the buyer repository;
- the license scope matches the number of teams and repositories.

Do not buy yet when the team needs generated application screens, owned routing, hosted schema storage or a replacement for their design system.
