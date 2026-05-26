// @archora-forge-generated
// @archora-forge-meta {"version":"1.2.1","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
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
