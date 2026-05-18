// @archora-forge-generated
// @archora-forge-meta {"version":"1.0.0","schemaHash":"66e8f461600e","configHash":"f1d971045876"}
import { customersClient } from '../../../shared/api/generated/customers/customers.client'
import { customersQueryKeys } from '../../../shared/api/generated/customers/customers.query-keys'
import type {
  CustomerDetailResponse,
  CustomerId,
} from '../../../shared/api/generated/customers/customers.types'

export function useCustomerQuery(id: CustomerId): Promise<CustomerDetailResponse> {
  customersQueryKeys.detail(id)
  return customersClient.getCustomer(id)
}
