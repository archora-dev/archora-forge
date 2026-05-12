# Private Schema Intake Checklist

Use this checklist for the first paid pilot conversation and workspace setup.

## Core Rule

Do not ask the customer to paste or attach raw private OpenAPI schemas in a public issue, public email thread or public chat. Do not commit private YAML, generated private output or screenshots containing private data.

Work in a temporary local folder unless the customer explicitly chooses a private repository or private branch they control.

## What The Customer Provides

- OpenAPI 3.x schema file or private schema URL.
- Any required local auth headers for fetching the schema.
- A short description of the API domain and the bounded pilot scope.
- Current frontend stack details: Vue version, TypeScript version, router, build tool and package manager.
- Query/data layer details: TanStack Query, Pinia, custom composables, REST client wrapper or other internal pattern.
- Auth and permissions model: route guards, policy names, role/permission source and token handling.
- Design system details: component library, table component, form component, validation library and i18n library.
- CI details: provider, branch policy, allowed generated-output checks and artifact retention rules.
- Routing and module conventions: feature folders, aliases, import style and code ownership.

## Safe Transfer And Viewing

Prefer one of these:

- customer runs all commands locally and shares redacted outputs;
- private screen share where the schema is visible only as needed;
- temporary private repository controlled by the customer;
- encrypted file transfer approved by the customer's security process.

Avoid:

- public GitHub issues;
- public email attachments;
- public chat uploads;
- pasted full schema snippets in vendor tools;
- screenshots with private endpoint names, field names, payloads or tokens.

## Data To Remove Or Mask

Before sharing any artifact outside the customer's private environment, remove or mask:

- real hostnames and internal service names;
- customer names, tenant names, project names and vendor names;
- endpoint paths that reveal private products or workflows;
- enum values that expose internal statuses or business processes;
- example payloads, example IDs, account numbers and personal data;
- bearer tokens, cookies, API keys and request headers;
- generated files that contain private route names, model names or field names;
- screenshots of reports, terminals or editors containing private schema data.

## Local Working Folder

Use a temporary folder outside committed source:

```bash
mkdir -p /tmp/archora-forge-pilot
cp /path/to/private-openapi.yaml /tmp/archora-forge-pilot/openapi.yaml
cd /tmp/archora-forge-pilot
```

If the customer evaluates inside their repo, use a private branch or ignored temporary folder and confirm generated output is excluded from commits until reviewed.

## Commands To Run Locally

With `FORGE_REPO` pointing at the Forge checkout:

```bash
cd "$FORGE_REPO"
pnpm build
node packages/cli/dist/index.js inspect /tmp/archora-forge-pilot/openapi.yaml --json
node packages/cli/dist/index.js lint /tmp/archora-forge-pilot/openapi.yaml
cd /tmp/archora-forge-pilot
node "$FORGE_REPO/packages/cli/dist/index.js" init
node "$FORGE_REPO/packages/cli/dist/index.js" generate ./openapi.yaml --config ./archora-forge.config.ts
node "$FORGE_REPO/packages/cli/dist/index.js" check ./openapi.yaml --config ./archora-forge.config.ts --report html --report-file ./forge-check.html
```

Create or edit `archora-forge.config.ts` in the temporary folder before generation. Adjust paths to the customer's install method. If a remote schema is required, use approved local headers and do not paste secrets into shared notes.

## Outputs Safe To Share After Redaction

- Health score and diagnostic counts.
- Counts of endpoints, schemas, tags, resources and generated files.
- Redacted diagnostics with endpoint and field names masked when needed.
- Redacted `check` markdown summary.
- High-level resource detection table with private names replaced by placeholders.
- A short list of unsupported OpenAPI patterns, written in generic terms.

## Outputs Not To Share Publicly

- Raw private OpenAPI YAML or JSON.
- Generated private TypeScript output.
- Private `archora-forge.config.ts` if it contains internal paths or names.
- HTML reports that include private endpoint, field or schema names.
- Terminal screenshots containing private paths, tokens, schema names or diagnostics.
- CI logs with private schema URLs, headers or generated diffs.

## Questions For The Customer

- Which frontend repo or package would own the generated resource layer?
- Which Vue version and TypeScript strictness settings are in use?
- Which query library or async-state pattern should generated helpers adapt to?
- How are auth headers added to API requests today?
- How are permissions represented in the app?
- Which design-system components should table, form and filter metadata map to?
- Which validation library is standard, if any?
- How are routes and feature modules organized?
- Where can generated code live without surprising code owners?
- What CI command can block drift without exposing private output?
- Who can review diagnostics that contain private endpoint and field names?
- What would make the pilot a go/no-go decision?

## Pilot Workspace Rules

- Do not commit private YAML.
- Do not commit generated private output.
- Do not commit screenshots with private data.
- Do not upload private reports to public issue trackers.
- Delete temporary local artifacts when the pilot review is complete, unless the customer asks to retain them in their private environment.
