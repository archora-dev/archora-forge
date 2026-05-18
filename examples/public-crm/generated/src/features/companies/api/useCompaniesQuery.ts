// @archora-forge-generated
// @archora-forge-meta {"version":"1.0.0","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
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
