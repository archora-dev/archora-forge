# CLI

The CLI is intentionally small: inspect the contract, review the generated resource contracts, then write files.

```bash
archora-forge init
archora-forge license status
archora-forge license request --plan trial --out license-request.md
archora-forge demo --out forge-demo
archora-forge doctor ./openapi.yaml
archora-forge inspect ./openapi.yaml
archora-forge validate ./openapi.yaml
archora-forge diff ./openapi.yaml
archora-forge lint ./openapi.yaml
archora-forge audit ./openapi.yaml
archora-forge pilot ./openapi.yaml --base main --repo .
archora-forge ci init github --schema ./openapi.yaml --base origin/main
archora-forge contract-diff ./old-openapi.yaml ./new-openapi.yaml
archora-forge impact ./openapi.yaml --base main --repo .
archora-forge explain unsupported-oneof
archora-forge generate ./openapi.yaml
```

For purchase evaluation, pair CLI output with:

- [Generated Output Typecheck](/generated-output-typecheck);
- [Product Demo Package](/product-demo-package);
- [Pilot Report Template](/pilot-report-template).

## Commands

- `init` creates `archora-forge.config.ts` with default or supplied output folders.
- `license activate <key>` stores a signed license key outside the consuming repository. `license request` writes a safe request file, `license status` validates an active key and `license remove` deletes it.
- `demo` creates a self-contained impact demo package with schemas, source usage, reports and go/no-go summary.
- `doctor` checks config discovery, schema loading, output paths, health score and diagnostics. It summarizes all configured `inputs` when no schema argument is passed.
- `inspect` prints schema summary, detected resources, health score and warnings.
- `validate` checks that the schema can be parsed and normalized.
- `diff` shows create/update/protected file counts without writing files.
- `lint` reports frontend generation readiness diagnostics.
- `audit` creates a local adoption package with HTML/JSON/Markdown reports, generated preview files, generated-output typecheck, CI workflow and adoption plan.
- `pilot` creates a paid-pilot package with impact, audit and go/no-go artifacts.
- `ci init github` writes a GitHub Actions workflow for PR impact review.
- `explain` explains a diagnostic code and the adoption risk behind it.
- `contract-diff` compares old/new contracts and reports affected generated files.
- `impact` creates a PR-ready frontend API impact report with merge risk, migration hints and affected generated surface.
- `generate` writes the frontend resource contract files.
- generated-output typecheck is run by `audit` or by the consuming workspace with `tsc --noEmit`; Forge reports TypeScript errors instead of hiding them behind a custom wrapper.

## Flags

- `--dry-run` prints the generation result without writing files.
- `--schema-header <name:value>` adds a one-off request header when loading remote `http://`/`https://` schemas; repeat it for multiple headers.
- `doctor --json` prints a machine-readable project readiness summary.
- `doctor --report-file <path>` writes the readiness summary as JSON.
- `inspect --report-file <path>` writes the inspection summary as JSON.
- `validate --report-file <path>` writes the validation summary as JSON.
- `lint --report-file <path>` writes the frontend readiness report as JSON.
- `diff --json` prints a machine-readable file plan for CI and automation.
- `diff --report-file <path>` writes the file plan as JSON.
- `generate --json` prints a machine-readable write summary; combine it with `--dry-run` for report-only automation.
- `generate --report-file <path>` writes the generation summary as JSON.
- `init --force` overwrites an existing starter config; `generate --force` is reserved for generated flows that opt into protected custom files.
- `check --min-health-score <score>` fails CI when the OpenAPI health score is below the supplied threshold.
- `init --input <path>` sets the starter OpenAPI schema path.
- `init --output <path> --features <path> --mocks <path>` sets starter output folders.
- `init --validation none|zod|valibot` enables generated validation schemas in the starter config.
- `inspect --json` includes resource names, entities, CRUD operation ids and missing CRUD operations.
- `check --report markdown|json --report-file <path>` writes a CI artifact report.
- `audit --out <path>` writes the full local adoption package.
- `audit --skip-typecheck` skips the generated TypeScript typecheck gate when TypeScript is not available in the current environment.
- `license request --plan trial|pilot|team|organization --out <path>` writes a license request markdown file without schemas, source code, env vars or private absolute paths.
- `pilot --old <schema> --repo <path> --out <path>` writes `impact.md`, `impact-pr.md`, `audit/` and `go-no-go.md`.
- `pilot --base <ref> --repo <path> --out <path>` reads the previous schema from git, for example `--base main`.
- `ci init github --schema <path> --base <ref> --mode impact|pilot --force` writes a GitHub workflow.
- `impact --report markdown|json|html --report-file <path>` writes a contract impact artifact.
- `impact <schema> --base <ref>` reads the previous schema from git instead of requiring an old schema file.
- `impact --repo <path>` scans a frontend repository for impacted generated API usages.
- `impact --pr-comment-file <path>` writes a compact pull-request comment artifact.
- `explain <diagnostic-code>` explains one diagnostic; `explain --list` lists known codes.

## License Activation

Commercial builds can enforce a signed local license by setting `ARCHORA_FORGE_LICENSE_PUBLIC_KEY_JWK`.
When enforcement is configured, `generate`, `check`, `audit` and `impact` require an active license.
Evaluation commands such as `init`, `doctor`, `inspect`, `validate`, `lint`, `diff` and `generate --dry-run` remain available.

```bash
archora-forge license activate ARCHORA-FORGE-...
archora-forge license request --plan trial --out license-request.md
archora-forge license status
archora-forge license remove
```

The key is stored outside the project by default:

```txt
~/.config/archora-forge/license.json
```

For CI or tests, override the path with `ARCHORA_FORGE_LICENSE_FILE`.

When a command is run with `--json`, command-level failures are reported as `{ "ok": false, "error": "..." }` and exit with code `2`.
Successful JSON payloads for readiness and generation commands include `ok: true`.

## Common Examples

Create a paid-pilot package:

```bash
archora-forge pilot ./openapi.yaml \
  --base main \
  --repo . \
  --out forge-pilot
```

Create a GitHub Actions impact workflow:

```bash
archora-forge ci init github --schema ./openapi.yaml --base origin/main
```

Audit one schema:

```bash
archora-forge audit ./openapi.yaml --out forge-audit
```

Review an API change before regeneration:

```bash
archora-forge impact ./openapi.yaml \
  --base origin/main \
  --repo . \
  --report markdown \
  --report-file forge-impact.md \
  --pr-comment-file forge-impact-pr.md
```

When the old schema is not available in git, use the two-file fallback:

```bash
archora-forge impact ./openapi.old.yaml ./openapi.yaml \
  --repo . \
  --report markdown \
  --report-file forge-impact.md \
  --pr-comment-file forge-impact-pr.md
```

Check generated drift in CI:

```bash
archora-forge check ./openapi.yaml --report html --report-file forge-check.html
```

For local repository development before publishing:

```bash
node packages/cli/dist/index.js inspect test/fixtures/openapi/basic-crud.yaml
```
