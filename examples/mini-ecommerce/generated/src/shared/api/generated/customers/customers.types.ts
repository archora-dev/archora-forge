// @archora-forge-generated
// @archora-forge-meta {"version":"1.2.0","schemaHash":"66e8f461600e","configHash":"f1d971045876"}
import type { Customer, UpdateCustomerDto } from '../components.types'

export type { Customer, UpdateCustomerDto } from '../components.types'

export type CustomerId = string

export type CustomerDetailResponse = Customer

export type CustomersListParams = Record<string, never>

export type CustomersListResponse = unknown

export type CreateCustomerRequest = Partial<Customer>

export type CreateCustomerResponse = Customer

export type UpdateCustomerRequest = UpdateCustomerDto

export type UpdateCustomerResponse = Customer
