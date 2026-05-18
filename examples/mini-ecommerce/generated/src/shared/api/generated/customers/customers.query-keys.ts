// @archora-forge-generated
import type { CustomerId, CustomersListParams } from './customers.types'

export const customersQueryKeys = {
  all: ['customers'] as const,
  list: (params?: CustomersListParams) => [...customersQueryKeys.all, 'list', params] as const,
  detail: (id: CustomerId) => [...customersQueryKeys.all, 'detail', id] as const,
} as const
