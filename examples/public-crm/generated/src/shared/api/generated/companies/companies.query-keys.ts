// @archora-forge-generated
// @archora-forge-meta {"version":"1.2.1","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
import type { CompanyId, CompaniesListParams } from './companies.types'

export const companiesQueryKeys = {
  all: ['companies'] as const,
  list: (params?: CompaniesListParams) => [...companiesQueryKeys.all, 'list', params] as const,
  detail: (id: CompanyId) => [...companiesQueryKeys.all, 'detail', id] as const,
} as const
