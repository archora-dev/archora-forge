# License enforcement

How the Pro (Forge Intelligence) tier is gated, and how to ship an enforced release.

## Model

Licenses are signed with **ECDSA P-256 / SHA-256** (asymmetric):

- The **private key** signs license keys and never leaves the owner's machine
  (`.license/private-key.jwk`).
- The **public key** only verifies signatures and is safe to distribute.

A license key is `ARCHORA-FORGE-<base64url(payload)>.<base64url(signature)>` where the
payload is `{ licenseId, customer, issuedAt, expiresAt, plan }`.

## The gate

Every Pro command (`pilot`, `ci`, `audit`, `check`, `contract-diff`/`impact`, registered
in `pro.ts`) calls `requireCommercialLicense()` at the start of its action. The
free generator tier never does — the `tier-guard` hook enforces that invariant.

`requireCommercialLicense` is a **no-op unless a verification public key is available**.
The key is resolved in this order (`license.ts` → `resolvePublicKeyJwk`):

1. **Build-embedded key** — baked into the bundle at build time (see below). Cannot be
   removed by a user, so release builds always enforce.
2. **`ARCHORA_FORGE_LICENSE_PUBLIC_KEY_JWK` env var** — for development and self-hosting.

When a key is present, the stored license is verified: signature → clock-rollback check
→ expiry. An active license passes; otherwise the command fails with an activation hint.

## Issuing and activating

```bash
pnpm license:keygen                                            # one-time: create the key pair
pnpm license:issue -- --customer "Acme" --days 90 --plan team # sign a license key
archora-forge license activate ARCHORA-FORGE-…                # user activates (stored in ~/.config)
archora-forge license status                                  # check validity
```

## Shipping an enforced release

`pnpm license:keygen` writes the public key to `.env.local` as
`ARCHORA_FORGE_LICENSE_PUBLIC_KEY_JWK`. Build the CLI with that key exported as the
**release** variable so tsup bakes it in (`packages/cli/tsup.config.ts` → `define`):

```bash
ARCHORA_FORGE_RELEASE_PUBLIC_KEY_JWK="$(cat .license/public-key.jwk)" pnpm --filter @archora/forge-cli build
```

The resulting `dist/index.js` enforces Pro for anyone running it — omitting the env var
no longer bypasses the gate. A plain `pnpm build` (no release key) produces a dev build
with enforcement off, which is what tests and `pack:check` use.

## What is still owner/infra work

- **Automated issuance** (license server) instead of the local `license:issue` script — block P3.
- **Seat counting** — licenses are per-customer with a plan/expiry; no seat enforcement yet — block P2.
- **Self-serve trial** — depends on the issuance server — block P1.
