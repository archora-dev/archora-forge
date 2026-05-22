import { companiesClient } from '../../../shared/api/generated/companies/companies.client'
import { companiesQueryKeys } from '../../../shared/api/generated/companies/companies.query-keys'
import type {
  CompaniesListParams,
  CompaniesListResponse,
} from '../../../shared/api/generated/companies/companies.types'

export function useCompaniesQuery(params?: CompaniesListParams): Promise<CompaniesListResponse> {
  companiesQueryKeys.list(params)
  return companiesClient.listCompanies(params)
}
