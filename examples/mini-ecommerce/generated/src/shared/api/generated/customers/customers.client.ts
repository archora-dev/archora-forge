// @archora-forge-generated
// @archora-forge-meta {"version":"2.1.0","schemaHash":"66e8f461600e","configHash":"f1d971045876"}
import {
  createApiClient,
  type ApiClient,
  type ApiClientOptions,
  type ApiRequestOptions,
} from '@archora/forge-runtime'
import type {
  CustomerId,
  CustomerDetailResponse,
  UpdateCustomerRequest,
  UpdateCustomerResponse,
} from './customers.types'

export type CustomersRequestOptions = Omit<ApiRequestOptions, 'body' | 'params'>

let apiClient = createApiClient({ baseUrl: '' })

export function configureCustomersClient(options: ApiClientOptions): void {
  apiClient = createApiClient(options)
}

export function setCustomersClient(client: ApiClient): void {
  apiClient = client
}

export const customersClient: {
  getCustomer: (
    customerId: CustomerId,
    options?: CustomersRequestOptions,
  ) => Promise<CustomerDetailResponse>
  updateCustomer: (
    customerId: CustomerId,
    payload: UpdateCustomerRequest,
    options?: CustomersRequestOptions,
  ) => Promise<UpdateCustomerResponse>
} = {
  getCustomer: (customerId, options) =>
    apiClient.request<CustomerDetailResponse>(
      'GET',
      `/customers/${encodeURIComponent(String(customerId))}`,
      options,
    ),
  updateCustomer: (customerId, payload, options) =>
    apiClient.request<UpdateCustomerResponse>(
      'PATCH',
      `/customers/${encodeURIComponent(String(customerId))}`,
      { ...options, body: payload },
    ),
}
