// @archora-forge-generated
import { companiesClient } from '../../../shared/api/generated/companies/companies.client'
import { companiesQueryKeys } from '../../../shared/api/generated/companies/companies.query-keys'
import type { CompanyId } from '../../../shared/api/generated/companies/companies.types'

export function useDeleteCompanyMutation(): {
  mutate: (id: CompanyId) => Promise<void>
  invalidate: () => ReturnType<typeof companiesQueryKeys.list>
} {
  return {
    mutate: (id) => companiesClient.deleteCompany(id),
    invalidate: () => companiesQueryKeys.list(),
  }
}
