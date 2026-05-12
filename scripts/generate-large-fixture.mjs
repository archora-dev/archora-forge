import { mkdirSync, writeFileSync } from 'node:fs'

const output = 'test/fixtures/openapi/large-synthetic.yaml'
const resourceCount = Number(process.env.ARCHORA_LARGE_RESOURCES ?? 100)

mkdirSync('test/fixtures/openapi', { recursive: true })

const paths = []
const schemas = []
for (let index = 1; index <= resourceCount; index += 1) {
  const entity = `LargeResource${index}`
  const path = `/large-resources-${index}`
  paths.push(`  ${path}:
    get:
      tags: [${entity}s]
      operationId: list${entity}s
      responses:
        '200':
          description: ${entity} list
          content:
            application/json:
              schema:
                type: object
                required: [items, total]
                properties:
                  items:
                    type: array
                    items:
                      $ref: '#/components/schemas/${entity}'
                  total:
                    type: integer
    post:
      tags: [${entity}s]
      operationId: create${entity}
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Create${entity}Dto'
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/${entity}'
  ${path}/{id}:
    get:
      tags: [${entity}s]
      operationId: get${entity}
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Detail
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/${entity}'
    patch:
      tags: [${entity}s]
      operationId: update${entity}
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Update${entity}Dto'
      responses:
        '200':
          description: Updated
    delete:
      tags: [${entity}s]
      operationId: delete${entity}
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '204':
          description: Deleted`)

  schemas.push(`    ${entity}:
      type: object
      required: [id, name, status]
      properties:
        id:
          type: string
        name:
          type: string
        status:
          type: string
          enum: [active, archived]
        nested:
          type: object
          properties:
            owner:
              type: string
            score:
              type: number
    Create${entity}Dto:
      type: object
      required: [name]
      properties:
        name:
          type: string
        status:
          type: string
          enum: [active, archived]
    Update${entity}Dto:
      type: object
      properties:
        name:
          type: string
        status:
          type: string
          enum: [active, archived]`)
}

writeFileSync(
  output,
  `openapi: 3.0.3
info:
  title: Large Synthetic API
  version: 1.0.0
paths:
${paths.join('\n')}
components:
  schemas:
${schemas.join('\n')}
`,
)

console.log(`Wrote ${output} with ${resourceCount} resources and ${resourceCount * 5} endpoints`)
