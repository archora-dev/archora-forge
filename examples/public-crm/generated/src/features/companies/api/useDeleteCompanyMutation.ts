// @archora-forge-generated
// @archora-forge-meta {"version":"1.2.2","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
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
