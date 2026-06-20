// @archora-forge-generated
// @archora-forge-meta {"version":"1.4.0","schemaHash":"66e8f461600e","configHash":"f1d971045876"}
import type { ItemId, ItemsListParams } from './items.types'

export const itemsQueryKeys = {
  all: ['items'] as const,
  list: (params?: ItemsListParams) => [...itemsQueryKeys.all, 'list', params] as const,
  detail: (id: ItemId) => [...itemsQueryKeys.all, 'detail', id] as const,
} as const
