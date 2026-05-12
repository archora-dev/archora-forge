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

pnpm exec archora-forge inspect openapi.yaml
pnpm exec archora-forge validate openapi.yaml
pnpm exec archora-forge diff openapi.yaml
pnpm exec archora-forge generate openapi.yaml --dry-run
pnpm exec archora-forge generate openapi.yaml
pnpm exec archora-forge check openapi.yaml

test -f src/shared/api/generated/users/users.client.ts
test -f src/features/users/ui/UsersTable.generated.vue
test -f src/pages/users/UsersPage.generated.vue
grep -q "listUsers" src/shared/api/generated/users/users.client.ts

echo "External consumer smoke passed: $CONSUMER_DIR"
