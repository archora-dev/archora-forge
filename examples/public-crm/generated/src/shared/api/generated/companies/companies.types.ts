// @archora-forge-generated
// @archora-forge-meta {"version":"2.1.0","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
import type {
  Company,
  CompanyCreatePayload,
  CompanyPage,
  CompanyUpdatePayload,
} from '../components.types'

export type {
  Company,
  CompanyCreatePayload,
  CompanyPage,
  CompanyUpdatePayload,
} from '../components.types'

export type CompanyId = string

export type CompanyDetailResponse = Company

export interface CompaniesListParams {
  page?: number
  pageSize?: number
  industry?: string
}

export type CompaniesListResponse = CompanyPage

export type CreateCompanyRequest = CompanyCreatePayload

export type CreateCompanyResponse = Company

export type UpdateCompanyRequest = CompanyUpdatePayload

export type UpdateCompanyResponse = Company
