# Pilot Email Kit

Use these short messages for the first paid pilot. Keep private schemas out of email unless the customer explicitly chooses to share them.

## First Reply

Subject: Archora Forge pilot

Hi,

Thanks for the Forge request.

Forge is a local-first OpenAPI impact tool for frontend teams. The normal pilot is one schema or one tightly related schema family, run inside your repo or CI. The goal is a go/no-go decision from artifacts:

- PR impact report for one API change;
- generated TypeScript resource layer;
- audit package;
- diagnostics and schema-readiness notes;
- CI workflow draft;
- final recommendation.

To start, send the generated request file:

```bash
npm install -D @archora/forge-cli
npx archora-forge license request --plan pilot --out license-request.md
```

Then send `license-request.md` to `akotov@archora.dev` or Telegram `@akotofff`.

No source code, schema contents, environment variables or private paths are required for the request file.

## Trial Key Reply

Subject: Archora Forge trial key

Hi,

Here is your Forge trial key:

```txt
LICENSE_KEY_HERE
```

Activate it in the repo where you want to evaluate Forge:

```bash
npx archora-forge license activate --key "LICENSE_KEY_HERE"
npx archora-forge license status
```

Recommended first run:

```bash
npx archora-forge demo --out forge-demo
npx archora-forge impact ./openapi.yaml --base origin/main --repo . --pr-comment-file .forge/impact-pr.md
npx archora-forge pilot ./openapi.yaml --base origin/main --repo . --out .forge/pilot
```

The pilot is successful when the team can decide whether Forge catches useful frontend API impact before merge and whether the generated TypeScript layer fits the repo.

## Follow-Up After Artifacts

Subject: Forge pilot review

Hi,

I reviewed the Forge artifacts. The decision points are:

- impact report: useful / not useful / needs schema change;
- generated TypeScript: fits / does not fit / needs config;
- diagnostics: clear / blocking / accepted;
- CI path: ready / needs setup;
- adoption recommendation: go / no-go / retry with changes.

Recommended next step:

ONE_CONCRETE_NEXT_STEP

The broader license should wait until the pilot artifacts show that Forge saves review time on a real API change.
