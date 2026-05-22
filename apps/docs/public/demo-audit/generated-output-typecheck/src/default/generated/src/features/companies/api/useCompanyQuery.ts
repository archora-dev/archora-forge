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
