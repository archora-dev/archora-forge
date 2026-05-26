// @archora-forge-generated
// @archora-forge-meta {"version":"1.2.2","schemaHash":"66e8f461600e","configHash":"f1d971045876"}
import type { CustomerId, CustomersListParams } from './customers.types'

export const customersQueryKeys = {
  all: ['customers'] as const,
  list: (params?: CustomersListParams) => [...customersQueryKeys.all, 'list', params] as const,
  detail: (id: CustomerId) => [...customersQueryKeys.all, 'detail', id] as const,
} as const
