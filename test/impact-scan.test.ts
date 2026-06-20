import { describe, expect, test } from 'vitest'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { diffOpenApiContracts, normalizeOpenApi } from '../packages/core/src/index.js'
import { scanSourceUsages } from '../packages/cli/src/impact-report.js'

const base = {
  openapi: '3.0.3',
  info: { title: 'Pets', version: '1.0.0' },
  paths: {
    '/pets': {
      get: {
        operationId: 'listPets',
        tags: ['Pets'],
        responses: {
          '200': {
            description: 'ok',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Pet' } },
              },
            },
          },
        },
      },
    },
    '/pets/{petId}': {
      parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'string' } }],
      get: {
        operationId: 'getPet',
        tags: ['Pets'],
        responses: {
          '200': {
            description: 'ok',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Pet: {
        type: 'object',
        required: ['id', 'name'],
        properties: { id: { type: 'string' }, name: { type: 'string' } },
      },
    },
  },
}

function breakingVariant() {
  const next = JSON.parse(JSON.stringify(base))
  delete next.paths['/pets/{petId}'] // removes getPet — a breaking change for the pets resource
  return next
}

describe('impact blast-radius scan', () => {
  test('finds real generated-API usages and rejects substring look-alikes', async () => {
    const report = diffOpenApiContracts(normalizeOpenApi(base), normalizeOpenApi(breakingVariant()))
    expect(report.affectedResources).toContain('pets')

    const repo = await mkdtemp(join(tmpdir(), 'forge-impact-scan-'))
    await mkdir(join(repo, 'src'), { recursive: true })
    await writeFile(
      join(repo, 'src', 'pet-detail.ts'),
      [
        "import { petsClient } from '../shared/api/generated/pets/pets.client'",
        "import { useGetPetQuery } from '../features/pets/api'",
        '',
        'export function load(id: string) {',
        '  return petsClient.getPet(id)',
        '}',
        'export const query = useGetPetQuery',
        '',
      ].join('\n'),
    )
    // Look-alikes: each contains a token as a substring but not as a whole identifier.
    await writeFile(
      join(repo, 'src', 'unrelated.ts'),
      [
        'const petsClientele: string[] = []',
        'function getPetByIdLocal() {}',
        'const useGetPetQueryResult = 1',
        'export { petsClientele, getPetByIdLocal, useGetPetQueryResult }',
        '',
      ].join('\n'),
    )

    const usages = await scanSourceUsages(repo, report)
    const paths = usages.map((usage) => usage.path)

    expect(paths).toContain('src/pet-detail.ts')
    expect(paths).not.toContain('src/unrelated.ts')

    const detail = usages.find((usage) => usage.path === 'src/pet-detail.ts')!
    expect(detail.matches).toContain('petsClient')
    expect(detail.matches).toContain('getPet')
    expect(detail.matches).toContain('useGetPetQuery')
    expect(detail.lines.length).toBeGreaterThan(0)
  })
})
