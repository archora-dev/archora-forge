# CLI

The CLI is intentionally small: inspect the contract, review the generated resource contracts, then write files.

```bash
archora-forge init
archora-forge doctor ./openapi.yaml
archora-forge inspect ./openapi.yaml
archora-forge validate ./openapi.yaml
archora-forge diff ./openapi.yaml
archora-forge lint ./openapi.yaml
archora-forge audit ./openapi.yaml
archora-forge contract-diff ./old-openapi.yaml ./new-openapi.yaml
archora-forge generate ./openapi.yaml
```

For self-serve purchase evaluation, pair CLI output with:

- [Generated Output Typecheck](/generated-output-typecheck);
- [Product Demo Package](/product-demo-package);
- [Pilot Report Template](/pilot-report-template).

## Commands

- `init` creates `archora-forge.config.ts` with default or supplied output folders.
- `doctor` checks config discovery, schema loading, output paths, health score and diagnostics. It summarizes all configured `inputs` when no schema argument is passed.
- `inspect` prints schema summary, detected resources, health score and warnings.
- `validate` checks that the schema can be parsed and normalized.
- `diff` shows create/update/protected file counts without writing files.
- `lint` reports frontend generation readiness diagnostics.
- `audit` creates a self-serve adoption package with HTML/JSON/Markdown reports, generated preview files, generated-output typecheck, CI workflow and adoption plan.
- `contract-diff` compares old/new contracts and reports affected generated files.
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
- `audit --out <path>` writes the full self-serve adoption package.
- `audit --skip-typecheck` skips the generated TypeScript typecheck gate when TypeScript is not available in the current environment.

When a command is run with `--json`, command-level failures are reported as `{ "ok": false, "error": "..." }` and exit with code `2`.
Successful JSON payloads for readiness and generation commands include `ok: true`.

For local repository development before publishing:

```bash
node packages/cli/dist/index.js inspect test/fixtures/openapi/basic-crud.yaml
```
