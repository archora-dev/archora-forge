import {
  createApiClient,
  type ApiClient,
  type ApiClientOptions,
  type ApiRequestOptions,
} from '@archora/forge-runtime'
import type {
  CompaniesListParams,
  CompaniesListResponse,
  CompanyId,
  CompanyDetailResponse,
  CreateCompanyRequest,
  CreateCompanyResponse,
  UpdateCompanyRequest,
  UpdateCompanyResponse,
} from './companies.types'

export type CompaniesRequestOptions = Omit<ApiRequestOptions, 'body' | 'params'>

let apiClient = createApiClient({ baseUrl: '' })

export function configureCompaniesClient(options: ApiClientOptions): void {
  apiClient = createApiClient(options)
}

export function setCompaniesClient(client: ApiClient): void {
  apiClient = client
}

export const companiesClient: {
  listCompanies: (
    params?: CompaniesListParams,
    options?: CompaniesRequestOptions,
  ) => Promise<CompaniesListResponse>
  getCompany: (
    companyId: CompanyId,
    options?: CompaniesRequestOptions,
  ) => Promise<CompanyDetailResponse>
  createCompany: (
    payload: CreateCompanyRequest,
    options?: CompaniesRequestOptions,
  ) => Promise<CreateCompanyResponse>
  updateCompany: (
    companyId: CompanyId,
    payload: UpdateCompanyRequest,
    options?: CompaniesRequestOptions,
  ) => Promise<UpdateCompanyResponse>
  deleteCompany: (companyId: CompanyId, options?: CompaniesRequestOptions) => Promise<void>
} = {
  listCompanies: (params, options) =>
    apiClient.request<CompaniesListResponse>('GET', `/companies`, {
      ...options,
      params: params as Record<string, unknown> | undefined,
    }),
  getCompany: (companyId, options) =>
    apiClient.request<CompanyDetailResponse>(
      'GET',
      `/companies/${encodeURIComponent(String(companyId))}`,
      options,
    ),
  createCompany: (payload, options) =>
    apiClient.request<CreateCompanyResponse>('POST', '/companies', { ...options, body: payload }),
  updateCompany: (companyId, payload, options) =>
    apiClient.request<UpdateCompanyResponse>(
      'PATCH',
      `/companies/${encodeURIComponent(String(companyId))}`,
      { ...options, body: payload },
    ),
  deleteCompany: (companyId, options) =>
    apiClient.request<void>(
      'DELETE',
      `/companies/${encodeURIComponent(String(companyId))}`,
      options,
    ),
}
