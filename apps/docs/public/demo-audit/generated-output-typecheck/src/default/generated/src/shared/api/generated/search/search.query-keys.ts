import type { SearchId, SearchesListParams } from './search.types'

export const searchQueryKeys = {
  all: ['search'] as const,
  list: (params?: SearchesListParams) => [...searchQueryKeys.all, 'list', params] as const,
  detail: (id: SearchId) => [...searchQueryKeys.all, 'detail', id] as const,
} as const
