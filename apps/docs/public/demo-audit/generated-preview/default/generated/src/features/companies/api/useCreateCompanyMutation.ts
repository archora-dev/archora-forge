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
