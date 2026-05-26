# License Operations

This is the manual license process for Archora Forge while there is no checkout or license portal.

## Roles

- Buyer runs `archora-forge license request` and sends the generated Markdown file.
- Seller reviews scope, plan and expiration.
- Seller issues a signed key locally.
- Buyer activates the key locally.

## Request

Customer command:

```bash
npm install -D @archora/forge-cli
npx archora-forge license request --plan trial --out license-request.md
```

Accepted plans:

- `trial`: short evaluation, usually 14 days;
- `pilot`: paid pilot, usually 30-45 days;
- `team`: team license;
- `organization`: organization license.

The request file is safe to email. It must not include schema contents, source code, environment variables, usernames or private absolute paths.

## Key Storage

The private signing key lives outside git:

```txt
.license/private-key.jwk
```

Do not commit `.license/`.

Generate the key pair once:

```bash
pnpm license:keygen
```

This writes the public key environment value to `.env.local`:

```txt
ARCHORA_FORGE_LICENSE_PUBLIC_KEY_JWK='<public-jwk-json>'
```

Use the same public key in the release environment where license enforcement is enabled.

## Issue A Key

Trial:

```bash
pnpm license:issue -- --customer "Customer Name" --days 14 --plan trial
```

Paid pilot:

```bash
pnpm license:issue -- --customer "Customer Name" --days 45 --plan pilot
```

Team:

```bash
pnpm license:issue -- --customer "Customer Name" --days 365 --plan team
```

Send only the printed `ARCHORA-FORGE-...` key to the customer.

## Customer Activation

```bash
npx archora-forge license activate --key "<license-key>"
npx archora-forge license status
```

Commercial commands are gated only when `ARCHORA_FORGE_LICENSE_PUBLIC_KEY_JWK` is configured. Public demo and request commands stay available.

## Renewal And Revocation

There is no remote revocation server. For now:

- issue short trial and pilot keys;
- rotate the signing key only when old keys must stop working;
- document the customer, plan, issue date and expiration in a private sales log;
- do not promise automatic renewal or portal access.

