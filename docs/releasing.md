# Releasing to npm

`.github/workflows/release.yml` publishes the six `@archora/forge-*` packages to npm
when a **GitHub Release** is published. It builds the CLI with the embedded license key
so the published binary enforces the Pro tier.

## One-time setup: repository secrets

Add these under **Settings → Secrets and variables → Actions → New repository secret**:

| Secret                                 | What it is                                                             | How to get it                                                                                                                                                      |
| -------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NPM_TOKEN`                            | npm token with publish access to the `@archora` scope                  | npmjs.com → Access Tokens → **Generate** → _Automation_ (or Granular, scoped to `@archora/*`, Read/Write).                                                         |
| `ARCHORA_FORGE_RELEASE_PUBLIC_KEY_JWK` | License **verification** public key (safe to expose; it only verifies) | Run `pnpm license:keygen` once; copy the value from `.env.local` (`ARCHORA_FORGE_LICENSE_PUBLIC_KEY_JWK=…`). Keep the matching private key in `.license/` private. |

The workflow **refuses to publish** if `ARCHORA_FORGE_RELEASE_PUBLIC_KEY_JWK` is missing,
so a release can never ship an unenforced (free-Pro) build by accident.

## Releasing

1. Bump the version of the publishable packages (npm rejects a version that already
   exists), e.g. `pnpm -r --filter "./packages/*" exec npm version minor`, and commit.
2. Push to `main`.
3. Create a **GitHub Release** with a tag (e.g. `v1.4.0`).

The workflow then: installs → checks the key secret → runs the test suite → builds with
the embedded key → `pnpm --filter "./packages/*" publish --access public`. `pnpm`
rewrites the `workspace:` dependency ranges to real versions on publish.

You can also trigger it manually via **Actions → Release → Run workflow**.

## Before the first public release

- The packages publish **under their current `license` field**. If the open-core move
  to MIT for the free packages is intended (plan block O2), do that first — publishing
  is irreversible per version.
- `@archora/forge-runtime` must be installable by consumers of the generated output
  (plan block O1); it has no framework dependencies, so it is safe to publish.

## Optional: build provenance

For supply-chain attestation, add `--provenance` to the publish step and
`permissions: id-token: write` to the job. This requires a public repository and npm's
provenance support; left off by default so the first release does not depend on it.
