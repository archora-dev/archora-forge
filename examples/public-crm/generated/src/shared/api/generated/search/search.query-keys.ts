// @archora-forge-generated
// @archora-forge-meta {"version":"1.2.0","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
import type { SearchId, SearchesListParams } from './search.types'

export const searchQueryKeys = {
  all: ['search'] as const,
  list: (params?: SearchesListParams) => [...searchQueryKeys.all, 'list', params] as const,
  detail: (id: SearchId) => [...searchQueryKeys.all, 'detail', id] as const,
} as const
