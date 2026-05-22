#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONSUMER_DIR="/tmp/archora-forge-consumer"
PACK_DIR="/tmp/archora-forge-pack"

rm -rf "$CONSUMER_DIR" "$PACK_DIR"
mkdir -p "$CONSUMER_DIR" "$PACK_DIR"

cd "$ROOT_DIR"
pnpm build

cd "$ROOT_DIR/packages/cli"
TARBALL="$(pnpm pack --pack-destination "$PACK_DIR" | tail -n 1)"

cd "$CONSUMER_DIR"
pnpm init >/dev/null
pnpm add "$TARBALL"

cat > openapi.yaml <<'YAML'
openapi: 3.0.3
info:
  title: Archora Forge Consumer Smoke API
  version: 1.0.0
paths:
  /users:
    get:
      tags: [Users]
      operationId: listUsers
      responses:
        '200':
          description: Users list
          content:
            application/json:
              schema:
                type: object
                required: [items, total, page]
                properties:
                  items:
                    type: array
                    items:
                      $ref: '#/components/schemas/User'
                  total:
                    type: integer
                  page:
                    type: integer
    post:
      tags: [Users]
      operationId: createUser
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserCreate'
      responses:
        '201':
          description: Created user
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
  /users/{id}:
    get:
      tags: [Users]
      operationId: getUser
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: User detail
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
components:
  schemas:
    User:
      type: object
      required: [id, email, status, createdAt]
      properties:
        id:
          type: string
          readOnly: true
        email:
          type: string
          format: email
        status:
          type: string
          enum: [active, invited, disabled]
        createdAt:
          type: string
          format: date-time
          readOnly: true
    UserCreate:
      type: object
      required: [email, status]
      properties:
        email:
          type: string
          format: email
        status:
          type: string
          enum: [active, invited, disabled]
YAML

pnpm exec archora-forge init --input ./openapi.yaml --validation valibot
test -f archora-forge.config.ts
grep -q "@archora/forge-cli" archora-forge.config.ts
grep -q "validation: 'valibot'" archora-forge.config.ts

pnpm exec archora-forge doctor --json --report-file forge-doctor.json
grep -q '"ok": true' forge-doctor.json
grep -q '"resourceCount": 1' forge-doctor.json
pnpm exec archora-forge inspect --json --report-file forge-inspect.json
grep -q '"ok": true' forge-inspect.json
grep -q '"resourceCount": 1' forge-inspect.json
pnpm exec archora-forge validate --json --report-file forge-validate.json
grep -q '"ok": true' forge-validate.json
grep -q '"score": 94' forge-validate.json
pnpm exec archora-forge lint --json --report-file forge-lint.json
grep -q '"ok": true' forge-lint.json
grep -q '"missing-error-response"' forge-lint.json
pnpm exec archora-forge diff
pnpm exec archora-forge diff --json --report-file forge-diff.json
grep -q '"ok": true' forge-diff.json
grep -q '"create": 18' forge-diff.json
pnpm exec archora-forge generate --dry-run --json --report-file forge-generate.json
grep -q '"ok": true' forge-generate.json
grep -q '"dryRun": true' forge-generate.json
if pnpm exec archora-forge lint --strict --json --report-file forge-lint-strict.json; then
  echo "Expected strict lint to fail for advisory CI coverage" >&2
  exit 1
fi
grep -q '"ok": false' forge-lint-strict.json
grep -q '"missing-error-response"' forge-lint-strict.json
pnpm exec archora-forge generate
pnpm exec archora-forge check --report markdown --report-file forge-check.md
pnpm exec archora-forge check --report html --report-file forge-check.html
pnpm exec archora-forge check --report json --report-file forge-check.json
grep -q '"ok": true' forge-check.json
if pnpm exec archora-forge check ./openapi.yaml --min-health-score 100 --report json --report-file forge-check-strict.json; then
  echo "Expected strict health-score check to fail for CI coverage" >&2
  exit 1
fi
grep -q '"ok": false' forge-check-strict.json
grep -q '"health-score"' forge-check-strict.json
test -f forge-check.md
test -f forge-check.html

test -f src/shared/api/generated/users/users.client.ts
test -f src/features/users/model/users.config.ts
test ! -e src/features/users/api/useUpdateUserMutation.ts
test ! -e src/features/users/api/useDeleteUserMutation.ts
test ! -e src/features/users/ui/UsersTable.generated.vue
test ! -e src/pages/users/UsersPage.generated.vue
grep -q "listUsers" src/shared/api/generated/users/users.client.ts
grep -q "columns:" src/features/users/model/users.config.ts

echo "External consumer smoke passed: $CONSUMER_DIR"
