#!/usr/bin/env sh
# Archora Forge pre-commit hook — fail the commit when the committed generated output
# is out of date, so stale resource contracts never land on a branch.
#
# Install:
#   - Husky:    copy to .husky/pre-commit
#   - Plain git: copy to .git/hooks/pre-commit and `chmod +x`
#
# Configure via env (defaults shown):
#   FORGE_SCHEMA=openapi.yaml   # OpenAPI schema path
#   FORGE_OUTPUT=src            # directory that holds Forge-owned generated output
#
# It regenerates with the free `generate` command and uses git to detect drift, so it
# works on the free tier without a license.
set -e

SCHEMA="${FORGE_SCHEMA:-openapi.yaml}"
OUTPUT="${FORGE_OUTPUT:-src}"

npx --no-install archora-forge generate "$SCHEMA" >/dev/null

if ! git diff --quiet -- "$OUTPUT"; then
  echo "✗ Archora Forge: committed output under '$OUTPUT' is out of date."
  echo "  Run: archora-forge generate $SCHEMA   (then stage the regenerated files)"
  git --no-pager diff --stat -- "$OUTPUT"
  exit 1
fi

echo "✓ Archora Forge: generated output is up to date."
