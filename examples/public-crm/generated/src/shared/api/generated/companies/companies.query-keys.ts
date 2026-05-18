// @archora-forge-generated
import type { CompanyId, CompaniesListParams } from './companies.types'

export const companiesQueryKeys = {
  all: ['companies'] as const,
  list: (params?: CompaniesListParams) => [...companiesQueryKeys.all, 'list', params] as const,
  detail: (id: CompanyId) => [...companiesQueryKeys.all, 'detail', id] as const,
} as const
