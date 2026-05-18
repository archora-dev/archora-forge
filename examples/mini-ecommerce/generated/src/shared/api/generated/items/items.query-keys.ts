import type { ItemId, ItemsListParams } from './items.types'

export const itemsQueryKeys = {
  all: ['items'] as const,
  list: (params?: ItemsListParams) => [...itemsQueryKeys.all, 'list', params] as const,
  detail: (id: ItemId) => [...itemsQueryKeys.all, 'detail', id] as const,
} as const
