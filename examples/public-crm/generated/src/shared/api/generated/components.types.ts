// @archora-forge-generated
// @archora-forge-meta {"version":"1.2.2","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
export type SearchResultTypeValue = 'contact' | 'company'

export interface ContactStatus {}

export interface Contact {
  id: string
  email: string
  displayName: string
  companyId?: string | null
  status: ContactStatus
  lastContactedAt?: string | null
  createdAt: string
}

export interface ContactCreatePayload {
  email: string
  displayName: string
  companyId?: string | null
  status?: ContactStatus
}

export interface ContactUpdatePayload {
  email?: string
  displayName?: string
  companyId?: string | null
  status?: ContactStatus
}

export interface ArchiveContactRequest {
  reason: string
}

export interface ContactPage {
  items: Contact[]
  page: number
  pageSize: number
  total: number
}

export interface Company {
  id: string
  name: string
  industry: string
  website?: string | null
  ownerContactId?: string | null
  createdAt: string
}

export interface CompanyCreatePayload {
  name: string
  industry: string
  website?: string | null
}

export interface CompanyUpdatePayload {
  name?: string
  industry?: string
  website?: string | null
  ownerContactId?: string | null
}

export interface CompanyPage {
  items: Company[]
  page: number
  pageSize: number
  total: number
}

export interface SearchResult {
  id: string
  type: SearchResultTypeValue
  title: string
  subtitle?: string | null
}

export interface DashboardSummary {
  activeContacts: number
  openCompanies: number
  conversionRate: number
}

export interface ErrorResponse {
  code: string
  message: string
}
