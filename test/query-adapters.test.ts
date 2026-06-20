import { describe, expect, test } from 'vitest'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import {
  createGenerationPlan,
  detectResources,
  normalizeOpenApi,
} from '../packages/core/src/index.js'
import { resolveForgeConfig } from '../packages/config/src/index.js'
import {
  resolveQueryComposables,
  tanstackQueryComposables,
  vueQueryComposables,
  type ComposableGenerators,
} from '../packages/adapters/src/index.js'

const crudSchema = {
  openapi: '3.0.3',
  info: { title: 'Widgets API', version: '1.0.0' },
  paths: {
    '/widgets': {
      get: {
        operationId: 'listWidgets',
        tags: ['Widgets'],
        responses: {
          '200': {
            description: 'Widgets',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Widget' } },
              },
            },
          },
        },
      },
      post: {
        operationId: 'createWidget',
        tags: ['Widgets'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Widget' } } },
        },
        responses: {
          '201': {
            description: 'Created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Widget' } } },
          },
        },
      },
    },
    '/widgets/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      get: {
        operationId: 'getWidget',
        tags: ['Widgets'],
        responses: {
          '200': {
            description: 'Widget',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Widget' } } },
          },
        },
      },
      patch: {
        operationId: 'updateWidget',
        tags: ['Widgets'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Widget' } } },
        },
        responses: {
          '200': {
            description: 'Updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Widget' } } },
          },
        },
      },
      delete: {
        operationId: 'deleteWidget',
        tags: ['Widgets'],
        responses: { '204': { description: 'Deleted' } },
      },
    },
  },
  components: {
    schemas: {
      Widget: {
        type: 'object',
        required: ['id', 'name'],
        properties: { id: { type: 'string' }, name: { type: 'string' } },
      },
    },
  },
}

async function createTempDir(): Promise<string> {
  return mkdir(
    join(tmpdir(), `archora-forge-adapters-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    {
      recursive: true,
    },
  ).then((dir) => dir as string)
}

async function planFor(composables: ComposableGenerators | undefined) {
  const normalized = normalizeOpenApi(crudSchema)
  return createGenerationPlan({
    config: resolveForgeConfig({ input: './openapi.yaml' }),
    normalized,
    resources: detectResources(normalized.operations),
    cwd: await createTempDir(),
    composables,
  })
}

function read(plan: Awaited<ReturnType<typeof planFor>>, suffix: string): string {
  return plan.files.find((file) => file.path.endsWith(suffix))?.content ?? ''
}

describe('query adapters', () => {
  test('resolveQueryComposables maps targets to generator sets', () => {
    expect(resolveQueryComposables('promise')).toBeUndefined()
    expect(resolveQueryComposables(undefined)).toBeUndefined()
    expect(resolveQueryComposables('unknown')).toBeUndefined()
    expect(resolveQueryComposables('tanstack-query')).toBe(tanstackQueryComposables)
    expect(resolveQueryComposables('vue-query')).toBe(vueQueryComposables)
  })

  test('tanstack-query emits real useQuery/useMutation hooks', async () => {
    const plan = await planFor(tanstackQueryComposables)
    const list = read(plan, 'useWidgetsQuery.ts')
    const detail = read(plan, 'useWidgetQuery.ts')
    const create = read(plan, 'useCreateWidgetMutation.ts')
    const update = read(plan, 'useUpdateWidgetMutation.ts')
    const remove = read(plan, 'useDeleteWidgetMutation.ts')

    expect(list).toContain("from '@tanstack/react-query'")
    expect(list).toContain('useQuery({')
    expect(list).toContain('queryKey: widgetsQueryKeys.list(params)')
    expect(list).toContain('queryFn: () => widgetsClient.listWidgets(params)')
    expect(list).toContain('...options')

    expect(detail).toContain('queryKey: widgetsQueryKeys.detail(id)')

    expect(create).toContain("from '@tanstack/react-query'")
    expect(create).toContain('useMutation({')
    expect(create).toContain('useQueryClient()')
    expect(create).toContain('queryClient.invalidateQueries({ queryKey: widgetsQueryKeys.list() })')
    expect(create).toContain(
      'mutationFn: (input: CreateWidgetRequest) => widgetsClient.createWidget(input)',
    )

    expect(update).toContain(
      'queryClient.invalidateQueries({ queryKey: widgetsQueryKeys.detail(variables.id) })',
    )
    expect(remove).toContain('queryClient.invalidateQueries({ queryKey: widgetsQueryKeys.list() })')
  })

  test('vue-query emits hooks importing from @tanstack/vue-query', async () => {
    const plan = await planFor(vueQueryComposables)
    const list = read(plan, 'useWidgetsQuery.ts')
    const create = read(plan, 'useCreateWidgetMutation.ts')

    expect(list).toContain("from '@tanstack/vue-query'")
    expect(list).toContain('useQuery({')
    expect(create).toContain("from '@tanstack/vue-query'")
    expect(create).toContain('useMutation({')
  })

  test('neutral default still emits framework-free promise helpers', async () => {
    const plan = await planFor(undefined)
    const list = read(plan, 'useWidgetsQuery.ts')

    expect(list).not.toContain('@tanstack/')
    expect(list).toContain('Promise<')
  })
})
