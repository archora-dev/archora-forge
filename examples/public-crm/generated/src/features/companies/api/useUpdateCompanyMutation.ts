import { companiesClient } from '../../../shared/api/generated/companies/companies.client'
import { companiesQueryKeys } from '../../../shared/api/generated/companies/companies.query-keys'
import type {
  CompanyId,
  UpdateCompanyRequest,
  UpdateCompanyResponse,
} from '../../../shared/api/generated/companies/companies.types'

export function useUpdateCompanyMutation(): {
  mutate: (input: {
    id: CompanyId
    payload: UpdateCompanyRequest
  }) => Promise<UpdateCompanyResponse>
  invalidate: (id: CompanyId) => ReturnType<typeof companiesQueryKeys.detail>
} {
  return {
    mutate: ({ id, payload }) => companiesClient.updateCompany(id, payload),
    invalidate: (id) => companiesQueryKeys.detail(id),
  }
}
