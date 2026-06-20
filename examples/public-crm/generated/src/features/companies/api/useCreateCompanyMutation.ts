// @archora-forge-generated
// @archora-forge-meta {"version":"1.4.0","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
import { companiesClient } from '../../../shared/api/generated/companies/companies.client'
import { companiesQueryKeys } from '../../../shared/api/generated/companies/companies.query-keys'
import type {
  CreateCompanyRequest,
  CreateCompanyResponse,
} from '../../../shared/api/generated/companies/companies.types'

export function useCreateCompanyMutation(): {
  mutate: (payload: CreateCompanyRequest) => Promise<CreateCompanyResponse>
  invalidate: () => ReturnType<typeof companiesQueryKeys.list>
} {
  return {
    mutate: (payload: CreateCompanyRequest) => companiesClient.createCompany(payload),
    invalidate: () => companiesQueryKeys.list(),
  }
}
