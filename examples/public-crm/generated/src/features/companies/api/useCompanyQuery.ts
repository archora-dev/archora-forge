// @archora-forge-generated
// @archora-forge-meta {"version":"1.2.1","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
import { companiesClient } from '../../../shared/api/generated/companies/companies.client'
import { companiesQueryKeys } from '../../../shared/api/generated/companies/companies.query-keys'
import type {
  CompanyDetailResponse,
  CompanyId,
} from '../../../shared/api/generated/companies/companies.types'

export function useCompanyQuery(id: CompanyId): Promise<CompanyDetailResponse> {
  companiesQueryKeys.detail(id)
  return companiesClient.getCompany(id)
}
