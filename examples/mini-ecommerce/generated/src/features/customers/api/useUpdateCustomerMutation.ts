// @archora-forge-generated
// @archora-forge-meta {"version":"2.1.0","schemaHash":"66e8f461600e","configHash":"f1d971045876"}
import { customersClient } from '../../../shared/api/generated/customers/customers.client'
import { customersQueryKeys } from '../../../shared/api/generated/customers/customers.query-keys'
import type {
  CustomerId,
  UpdateCustomerRequest,
  UpdateCustomerResponse,
} from '../../../shared/api/generated/customers/customers.types'

export function useUpdateCustomerMutation(): {
  mutate: (input: {
    id: CustomerId
    payload: UpdateCustomerRequest
  }) => Promise<UpdateCustomerResponse>
  invalidate: (id: CustomerId) => ReturnType<typeof customersQueryKeys.detail>
} {
  return {
    mutate: ({ id, payload }) => customersClient.updateCustomer(id, payload),
    invalidate: (id) => customersQueryKeys.detail(id),
  }
}
